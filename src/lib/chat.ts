import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useSession, useTrip } from '../store';
import { supabase } from './supabase';

export interface ChatMessage { id: string; memberId: string | null; body: string; createdAt: string; pending?: boolean; failed?: boolean }

const demoMessages = (): ChatMessage[] => {
  const t = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
  return [
    { id: 'd1', memberId: 'm2', body: '숙소 투표 다들 했어? 🙋', createdAt: t(180) },
    { id: 'd2', memberId: 'm3', body: '나 삿포로역 호텔 B! 오타루 가기 편해서', createdAt: t(175) },
    { id: 'd3', memberId: 'm4', body: '스프카레 가라쿠 웨이팅 30분이래 ㅠ 오픈런 가자', createdAt: t(42) },
    { id: 'd4', memberId: 'm1', body: '콜 11시 오픈 맞춰서 가자 🍛', createdAt: t(40) },
  ];
};

type Row = { id: string; member_id: string | null; body: string; created_at: string };
const map = (r: Row): ChatMessage => ({ id: r.id, memberId: r.member_id, body: r.body, createdAt: r.created_at });

/** 서버에서 읽은 목록과 화면 목록을 합친다: 서버 것이 기준, 아직 보내는 중/실패한 내 메시지는 남긴다 */
function merge(local: ChatMessage[], server: ChatMessage[]): ChatMessage[] {
  const ids = new Set(server.map((m) => m.id));
  const keep = local.filter((m) => (m.pending || m.failed) && !ids.has(m.id) && !server.some((s) => s.memberId === m.memberId && s.body === m.body && Math.abs(Date.parse(s.createdAt) - Date.parse(m.createdAt)) < 60_000));
  return [...server, ...keep].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/** 여행방 단톡. 서버 모드에선 실시간, 샘플 모드에선 이 화면 안에서만 */
export function useChat() {
  const { mode } = useSession();
  const { state } = useTrip();
  const tripId = state.trip.id;
  const meId = state.meId;
  const demo = mode === 'demo';
  const [messages, setMessages] = useState<ChatMessage[]>(() => (demo ? demoMessages() : []));
  const [loaded, setLoaded] = useState(demo);
  // 멤버별 '어디까지 읽었나' (카톡의 안 읽은 숫자용)
  const [reads, setReads] = useState<Record<string, string>>((): Record<string, string> => {
    if (!demo) return {};
    const t = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
    return { m2: t(39), m3: t(170), m4: t(60) };
  });
  const loadRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (demo) return;
    let alive = true;
    const load = async () => {
      const [{ data }, { data: rd }] = await Promise.all([
        supabase.from('messages').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }).limit(300),
        supabase.from('chat_reads').select('member_id,last_read_at').eq('trip_id', tripId),
      ]);
      if (!alive) return;
      if (data) { setMessages((xs) => merge(xs, data.map(map).reverse())); setLoaded(true); }
      if (rd) setReads((r) => ({ ...Object.fromEntries(rd.map((x) => [x.member_id, x.last_read_at])), ...pickNewer(r, rd) }));
    };
    loadRef.current = load;
    load();
    const ch = supabase.channel(`chat-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reads', filter: `trip_id=eq.${tripId}` }, (p) => {
        const row = p.new as { member_id?: string; last_read_at?: string };
        if (row.member_id && row.last_read_at) setReads((r) => (ms(r[row.member_id!]) >= ms(row.last_read_at!) ? r : { ...r, [row.member_id!]: row.last_read_at! }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `trip_id=eq.${tripId}` }, (p) => {
        const m = map(p.new as Row);
        setMessages((xs) => {
          if (xs.some((x) => x.id === m.id)) return xs;
          // 내가 보낸 임시 메시지를 진짜 메시지로 바꾼다
          const i = xs.findIndex((x) => x.pending && x.memberId === m.memberId && x.body === m.body);
          if (i >= 0) { const copy = [...xs]; copy[i] = m; return copy; }
          return [...xs, m];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => {
        const id = (p.old as { id?: string }).id;
        if (id) setMessages((xs) => xs.filter((x) => x.id !== id));
      })
      // 연결이 (다시) 붙으면 끊긴 동안 온 메시지를 다시 읽는다
      .subscribe((status) => { if (status === 'SUBSCRIBED') load(); });
    // 앱으로 돌아올 때, 인터넷이 돌아올 때도 다시 읽는다
    const sub = AppState.addEventListener('change', (s) => s === 'active' && load());
    const online = () => load();
    if (Platform.OS === 'web') window.addEventListener('online', online);
    return () => {
      alive = false; supabase.removeChannel(ch); sub.remove();
      if (Platform.OS === 'web') window.removeEventListener('online', online);
    };
  }, [demo, tripId]);

  const deliver = useCallback(async (temp: ChatMessage) => {
    const { data, error } = await supabase.from('messages').insert({ trip_id: tripId, member_id: meId, body: temp.body }).select('*').single();
    setMessages((xs) => xs
      .map((x) => (x.id === temp.id ? (error ? { ...x, pending: false, failed: true } : map(data as Row)) : x))
      .filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i));
    if (error) throw new Error(error.message);
  }, [tripId, meId]);

  const send = useCallback(async (body: string) => {
    const text = body.trim();
    if (!text) return;
    const temp: ChatMessage = { id: `tmp-${Date.now()}`, memberId: meId, body: text, createdAt: new Date().toISOString(), pending: !demo };
    setMessages((xs) => [...xs, temp]);
    if (demo) return;
    await deliver(temp);
  }, [demo, meId, deliver]);

  /** 실패한 메시지를 다시 보낸다 */
  const retry = useCallback(async (id: string) => {
    const m = messages.find((x) => x.id === id && x.failed);
    if (!m) return;
    const temp = { ...m, failed: false, pending: true, createdAt: new Date().toISOString() };
    setMessages((xs) => xs.map((x) => (x.id === id ? temp : x)));
    await deliver(temp).catch(() => {});
  }, [messages, deliver]);

  /** 내가 여기까지 읽었다고 저장 (더 최신일 때만) */
  const markRead = useCallback((ts: string) => {
    setReads((r) => {
      if (ms(r[meId]) >= ms(ts)) return r;
      if (!demo) supabase.from('chat_reads').upsert({ trip_id: tripId, member_id: meId, last_read_at: ts }).then(() => {});
      return { ...r, [meId]: ts };
    });
  }, [demo, tripId, meId]);

  // 카톡처럼: 메시지를 보낸 사람은 그 앞의 메시지를 다 읽은 걸로 친다
  const seenUpTo = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(reads)) out[k] = ms(v);
    for (const m of messages) if (m.memberId && !m.pending && !m.failed) out[m.memberId] = Math.max(out[m.memberId] ?? 0, ms(m.createdAt));
    return out;
  }, [reads, messages]);

  /** 이 메시지를 아직 안 읽은 사람 수 (보낸 사람 빼고) */
  const unreadCount = useCallback((m: ChatMessage) =>
    state.trip.members.filter((x) => x.id !== m.memberId && (seenUpTo[x.id] ?? 0) < ms(m.createdAt)).length,
  [seenUpTo, state.trip.members]);

  return { messages, loaded, send, retry, meId, reads, markRead, unreadCount, reload: () => loadRef.current() };
}

const ms = (s?: string) => (s ? Date.parse(s) : 0);
const pickNewer = (local: Record<string, string>, rows: { member_id: string; last_read_at: string }[]) =>
  Object.fromEntries(Object.entries(local).filter(([k, v]) => !rows.some((x) => x.member_id === k && ms(x.last_read_at) >= ms(v))));

/** 탭 배지: 내가 아직 안 읽은 남의 메시지 수 */
export function useUnread(chat: ReturnType<typeof useChat>, viewing: boolean) {
  const last = [...chat.messages].reverse().find((m) => !m.pending && !m.failed)?.createdAt;
  const { markRead } = chat;
  useEffect(() => { if (viewing && last) markRead(last); }, [viewing, last, markRead]);
  const mine = chat.reads[chat.meId];
  return chat.messages.filter((m) => m.memberId !== chat.meId && !m.pending && !m.failed && ms(mine) < ms(m.createdAt)).length;
}
