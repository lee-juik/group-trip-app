import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useSession, useTrip } from '../store';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showError, uuid } from './util';

/** loading: 처음 받는 중 · live: 서버 값 · cached: 휴대폰에 저장해 둔 마지막 값(서버에 못 닿음) · offline: 저장본도 없음 */
export type LiveStatus = 'loading' | 'live' | 'cached' | 'offline';

/**
 * '함께' 탭(준비물·정산·사진)의 데이터. 여행 정보(store)와 따로 움직이도록
 * 표마다 읽기 + 실시간 구독을 한다 (수다방 useChat 과 같은 방식). 샘플 모드에선 화면 안에서만.
 */
function useLiveTable<T extends { id: string }>(table: string, select: string, map: (r: any) => T, demo: () => T[], order: { col: string; asc: boolean }) {
  const { mode } = useSession();
  const tripId = useTrip().state.trip.id;
  const isDemo = mode === 'demo';
  const [rows, setRows] = useState<T[]>(() => (isDemo ? demo() : []));
  const [status, setStatus] = useState<LiveStatus>(isDemo ? 'live' : 'loading');
  const [savedAt, setSavedAt] = useState<number | undefined>();
  const loadRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (isDemo) return;
    let alive = true;
    let gotServer = false;
    const key = `together:${table}:${tripId}`;
    const load = async () => {
      let res: { data: unknown; error: unknown };
      try { res = await supabase.from(table).select(select).eq('trip_id', tripId).order(order.col, { ascending: order.asc }).limit(1000); }
      catch (e) { res = { data: null, error: e }; }
      if (!alive) return;
      if (res.error || !res.data) {
        // 인터넷이 끊겼을 때: 화면을 비우지 않고 마지막 저장본을 그대로 둔다
        setStatus((s) => (s === 'live' || s === 'cached' ? 'cached' : 'offline'));
        return;
      }
      gotServer = true;
      const next = (res.data as unknown[]).map(map);
      setRows(next); setStatus('live'); setSavedAt(Date.now());
      AsyncStorage.setItem(key, JSON.stringify({ rows: next, at: Date.now() })).catch(() => {});
    };
    loadRef.current = load;
    // 휴대폰에 저장해 둔 마지막 값을 먼저 보여 주고, 서버 값이 오면 바꾼다
    AsyncStorage.getItem(key).then((raw) => {
      if (!alive || gotServer || !raw) return;
      try {
        const c = JSON.parse(raw) as { rows: T[]; at: number };
        if (!Array.isArray(c.rows)) return;
        setRows(c.rows); setSavedAt(c.at); setStatus((s) => (s === 'live' ? s : 'cached'));
      } catch {}
    }).catch(() => {});
    load();
    let t: ReturnType<typeof setTimeout> | undefined;
    const soon = () => { clearTimeout(t); t = setTimeout(load, 250); };
    const ch = supabase.channel(`${table}-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `trip_id=eq.${tripId}` }, soon)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, soon)
      .subscribe((s) => { if (s === 'SUBSCRIBED') load(); });
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    const online = () => load();
    if (Platform.OS === 'web') window.addEventListener('online', online);
    return () => {
      alive = false; clearTimeout(t); supabase.removeChannel(ch); app.remove();
      if (Platform.OS === 'web') window.removeEventListener('online', online);
    };
  }, [tripId, isDemo]);

  /** 화면부터 바꾸고 서버에 보낸다. 실패하면 알려주고 서버 값으로 되돌린다 */
  const write = useCallback(async (local: (xs: T[]) => T[], remote: () => PromiseLike<{ error: { message: string } | null }>, what: string) => {
    setRows(local);
    if (isDemo) return true;
    let error: { message: string } | null;
    try { error = (await remote()).error; } catch (e) { error = { message: e instanceof Error ? e.message : String(e) }; }
    if (error) { showError(`${what} 실패`, new Error(error.message)); await loadRef.current(); return false; }
    return true;
  }, [isDemo]);

  return { rows, setRows, loaded: status === 'live' || status === 'cached', status, savedAt, write, reload: () => loadRef.current(), demo: isDemo, tripId };
}

// ───────────────────────── 준비물 ─────────────────────────

export interface Todo { id: string; title: string; assignee: string | null; checks: string[]; createdBy: string | null; createdAt: string }

const demoTodos = (): Todo[] => [
  { id: 't1', title: '여권', assignee: null, checks: ['m1', 'm2', 'm3'], createdBy: 'm1', createdAt: '2026-11-01' },
  { id: 't2', title: '핫팩 · 장갑 (영하예요!)', assignee: null, checks: ['m2'], createdBy: 'm2', createdAt: '2026-11-02' },
  { id: 't3', title: 'eSIM / 포켓와이파이', assignee: 'm1', checks: [], createdBy: 'm1', createdAt: '2026-11-03' },
  { id: 't4', title: '야키니쿠킹 예약', assignee: 'm3', checks: ['m3'], createdBy: 'm1', createdAt: '2026-11-04' },
];

export function useTodos() {
  const { state } = useTrip();
  const meId = state.meId;
  const t = useLiveTable<Todo>('todos', 'id,title,assignee,created_by,created_at,todo_checks(member_id)', (r) => ({
    id: r.id, title: r.title, assignee: r.assignee, createdBy: r.created_by, createdAt: r.created_at,
    checks: (r.todo_checks ?? []).map((x: { member_id: string }) => x.member_id),
  }), demoTodos, { col: 'created_at', asc: true });
  // 체크 표는 따로 실시간으로 온다
  useEffect(() => {
    if (t.demo) return;
    const ch = supabase.channel(`todo_checks-${t.tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_checks', filter: `trip_id=eq.${t.tripId}` }, () => t.reload())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'todo_checks' }, () => t.reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [t.tripId, t.demo]);

  const add = (title: string, assignee: string | null) => {
    const id = uuid();
    const row: Todo = { id, title, assignee, checks: [], createdBy: meId, createdAt: new Date().toISOString() };
    return t.write((xs) => [...xs, row], () => supabase.from('todos').insert({ id, trip_id: t.tripId, title, assignee, created_by: meId }), '준비물 넣기');
  };
  const toggle = (todo: Todo) => {
    const on = todo.checks.includes(meId);
    return t.write(
      (xs) => xs.map((x) => (x.id === todo.id ? { ...x, checks: on ? x.checks.filter((m) => m !== meId) : [...x.checks, meId] } : x)),
      () => (on
        ? supabase.from('todo_checks').delete().eq('todo_id', todo.id).eq('member_id', meId)
        : supabase.from('todo_checks').insert({ todo_id: todo.id, member_id: meId, trip_id: t.tripId })),
      '체크',
    );
  };
  const update = (id: string, patch: { title?: string; assignee?: string | null }) =>
    t.write((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)), () => supabase.from('todos').update(patch).eq('id', id), '고치기');
  const remove = (id: string) => t.write((xs) => xs.filter((x) => x.id !== id), () => supabase.from('todos').delete().eq('id', id), '지우기');
  return { todos: t.rows, loaded: t.loaded, status: t.status, savedAt: t.savedAt, add, toggle, update, remove };
}

// ───────────────────────── 정산 ─────────────────────────

export type Currency = 'JPY' | 'KRW' | 'USD';
export const CURRENCY: Record<Currency, { sign: string; label: string }> = { JPY: { sign: '¥', label: '엔' }, KRW: { sign: '₩', label: '원' }, USD: { sign: '$', label: '달러' } };
export const EXPENSE_CATS = [
  { key: '식비', emoji: '🍜' }, { key: '카페', emoji: '☕' }, { key: '교통', emoji: '🚃' }, { key: '숙소', emoji: '🛏' },
  { key: '쇼핑', emoji: '🛍' }, { key: '관광', emoji: '🎡' }, { key: '기타', emoji: '💸' },
] as const;
export const catEmoji = (k: string) => EXPENSE_CATS.find((x) => x.key === k)?.emoji ?? '💸';

export interface Expense {
  id: string; title: string; amount: number; currency: Currency; rate: number; paidBy: string; splitAmong: string[];
  category: string; spentOn: string; isTransfer: boolean; createdBy: string | null;
  /** 영수증 사진 (버킷 trip-photos 안 <trip_id>/receipts/...). 없으면 null */
  receiptPath?: string | null;
  receiptUrl?: string;
}
export type ExpenseInput = Omit<Expense, 'id' | 'createdBy' | 'receiptUrl'>;
export const krwOf = (e: Pick<Expense, 'amount' | 'rate'>) => Math.round(e.amount * e.rate);

const demoExpenses = (): Expense[] => [
  { id: 'e1', title: '스프카레 가라쿠', amount: 7200, currency: 'JPY', rate: 9.3, paidBy: 'm1', splitAmong: ['m1', 'm2', 'm3', 'm4'], category: '식비', spentOn: '2026-11-15', isTransfer: false, createdBy: 'm1' },
  { id: 'e2', title: 'JR 쾌속 에어포트', amount: 4920, currency: 'JPY', rate: 9.3, paidBy: 'm2', splitAmong: ['m1', 'm2', 'm3', 'm4'], category: '교통', spentOn: '2026-11-15', isTransfer: false, createdBy: 'm2' },
  { id: 'e3', title: '로이스 초콜릿', amount: 3000, currency: 'JPY', rate: 9.3, paidBy: 'm3', splitAmong: ['m3', 'm4'], category: '쇼핑', spentOn: '2026-11-16', isTransfer: false, createdBy: 'm3' },
];

const toRow = (e: ExpenseInput) => ({
  title: e.title, amount: e.amount, currency: e.currency, rate: e.rate, paid_by: e.paidBy, split_among: e.splitAmong,
  category: e.category, spent_on: e.spentOn, is_transfer: e.isTransfer, receipt_path: e.receiptPath ?? null,
});

export function useExpenses() {
  const { state } = useTrip();
  const meId = state.meId;
  const t = useLiveTable<Expense>('expenses', '*', (r) => ({
    id: r.id, title: r.title, amount: Number(r.amount), currency: r.currency, rate: Number(r.rate), paidBy: r.paid_by,
    splitAmong: r.split_among, category: r.category, spentOn: r.spent_on, isTransfer: r.is_transfer, createdBy: r.created_by,
    receiptPath: r.receipt_path ?? null,
  }), demoExpenses, { col: 'created_at', asc: true });

  // 영수증 사진 보기용 임시 주소
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (t.demo) return;
    const need = t.rows.map((e) => e.receiptPath).filter((x): x is string => !!x && !(x in urls));
    if (!need.length) return;
    supabase.storage.from('trip-photos').createSignedUrls(need, 60 * 60 * 24).then(({ data }) => {
      if (!data) return;
      setUrls((u) => ({ ...u, ...Object.fromEntries(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string])) }));
    });
  }, [t.rows, t.demo]);
  const expenses = t.rows.map((e) => ({ ...e, receiptUrl: e.receiptPath ? (t.demo ? e.receiptPath : urls[e.receiptPath]) : undefined }));

  /** 영수증 사진을 원본 그대로 올리고 경로를 돌려준다 (지출 저장할 때 같이 넣는다) */
  const uploadReceipt = async (f: Picked): Promise<string | undefined> => {
    if (t.demo) return f.uri;
    const orig = await original(f);
    const path = `${t.tripId}/receipts/${uuid()}.${orig.ext}`;
    const { error } = await supabase.storage.from('trip-photos').upload(path, orig.body, { contentType: orig.type });
    if (error) { showError('영수증 올리기 실패', new Error(error.message)); return undefined; }
    if (Platform.OS === 'web') setUrls((u) => ({ ...u, [path]: URL.createObjectURL(orig.body as Blob) }));
    return path;
  };

  const add = (e: ExpenseInput) => {
    const id = uuid();
    return t.write((xs) => [...xs, { ...e, id, createdBy: meId }], () => supabase.from('expenses').insert({ id, trip_id: t.tripId, created_by: meId, ...toRow(e) }), '지출 넣기');
  };
  const update = (id: string, e: ExpenseInput) =>
    t.write((xs) => xs.map((x) => (x.id === id ? { ...x, ...e } : x)), () => supabase.from('expenses').update(toRow(e)).eq('id', id), '지출 고치기');
  const remove = (id: string) => t.write((xs) => xs.filter((x) => x.id !== id), () => supabase.from('expenses').delete().eq('id', id), '지출 지우기');
  return { expenses, loaded: t.loaded, status: t.status, savedAt: t.savedAt, add, update, remove, uploadReceipt };
}

/** 멤버별 받을 돈(+) / 줄 돈(-), 원 단위 */
export function balances(expenses: Expense[], memberIds: string[]) {
  const b: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  for (const e of expenses) {
    const won = krwOf(e);
    b[e.paidBy] = (b[e.paidBy] ?? 0) + won;
    const n = e.splitAmong.length;
    e.splitAmong.forEach((m, i) => {
      // 나누어 떨어지지 않는 1원은 앞사람부터
      const share = Math.floor(won / n) + (i < won % n ? 1 : 0);
      b[m] = (b[m] ?? 0) - share;
    });
  }
  return b;
}

/** 가장 적은 횟수로 주고받기: 많이 줄 사람 → 많이 받을 사람 순으로 맞춘다 */
export function settle(b: Record<string, number>): { from: string; to: string; won: number }[] {
  const give = Object.entries(b).filter(([, v]) => v < -9).map(([id, v]) => ({ id, v: -v })).sort((x, y) => y.v - x.v);
  const get = Object.entries(b).filter(([, v]) => v > 9).map(([id, v]) => ({ id, v })).sort((x, y) => y.v - x.v);
  const out: { from: string; to: string; won: number }[] = [];
  let i = 0, j = 0;
  while (i < give.length && j < get.length) {
    const won = Math.min(give[i].v, get[j].v);
    if (won >= 10) out.push({ from: give[i].id, to: get[j].id, won: Math.round(won) });
    give[i].v -= won; get[j].v -= won;
    if (give[i].v < 10) i++;
    if (get[j].v < 10) j++;
  }
  return out;
}

/** 오늘 환율(1엔 = ?원). 못 가져오면 undefined */
export async function fetchRate(cur: Currency): Promise<number | undefined> {
  if (cur === 'KRW') return 1;
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${cur}`);
    const j = await r.json();
    const v = Number(j?.rates?.KRW);
    return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : undefined;
  } catch { return undefined; }
}

// ───────────────────────── 사진 ─────────────────────────

export interface Photo { id: string; memberId: string | null; path: string; caption: string | null; takenOn: string; placeId: string | null; width?: number; height?: number; createdAt: string; url?: string; thumbUrl?: string }

/** 원본 옆에 같이 올리는 작은 미리보기 (앨범 화면용): abc.jpg → abc_s.jpg */
export const thumbPath = (path: string) => path.replace(/\.[^./]+$/, '') + '_s.jpg';

const demoPhotos = (): Photo[] => [];

export type Picked = { uri: string; width?: number; height?: number; file?: Blob; mimeType?: string; fileName?: string | null };

export function usePhotos() {
  const { state } = useTrip();
  const meId = state.meId;
  const t = useLiveTable<Photo>('photos', '*', (r) => ({
    id: r.id, memberId: r.member_id, path: r.path, caption: r.caption, takenOn: r.taken_on, placeId: r.place_id,
    width: r.width ?? undefined, height: r.height ?? undefined, createdAt: r.created_at,
  }), demoPhotos, { col: 'created_at', asc: false });

  // 비공개 버킷이라 볼 수 있는 임시 주소(하루짜리)를 받아 둔다. 원본과 미리보기 둘 다
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (t.demo) return;
    const need = t.rows.flatMap((p) => [p.path, thumbPath(p.path)]).filter((x) => !(x in urls));
    if (!need.length) return;
    supabase.storage.from('trip-photos').createSignedUrls(need, 60 * 60 * 24).then(({ data }) => {
      if (!data) return;
      // 미리보기가 없는 사진(못 만든 경우)은 빈 값으로 표시해서 원본을 쓰게 한다
      setUrls((u) => ({ ...u, ...Object.fromEntries(need.map((x) => [x, ''])), ...Object.fromEntries(data.filter((d) => d.signedUrl && d.path && !d.error).map((d) => [d.path!, d.signedUrl as string])) }));
    });
  }, [t.rows, t.demo]);

  const photos = t.rows.map((p) => ({ ...p, url: p.url ?? (urls[p.path] || undefined), thumbUrl: p.thumbUrl ?? (urls[thumbPath(p.path)] || undefined) }));

  /** 고른 사진을 원본 그대로 올리고, 앨범용 작은 미리보기를 하나 더 올린다 */
  const upload = async (files: Picked[], takenOn: string, onProgress?: (done: number) => void) => {
    let done = 0;
    for (const f of files) {
      const id = uuid();
      const orig = await original(f);
      const small = await thumbnail(orig.body, f);
      if (t.demo) {
        t.setRows((xs) => [{ id, memberId: meId, path: id, caption: null, takenOn, placeId: null, width: small?.width ?? f.width, height: small?.height ?? f.height, createdAt: new Date().toISOString(), url: f.uri, thumbUrl: small?.preview }, ...xs]);
      } else {
        const path = `${t.tripId}/${id}.${orig.ext}`;
        const up = await supabase.storage.from('trip-photos').upload(path, orig.body, { contentType: orig.type, upsert: false });
        if (up.error) { showError('사진 올리기 실패', new Error(/size|large/i.test(up.error.message) ? '사진 한 장이 너무 커요 (50MB 넘음).' : up.error.message)); continue; }
        if (small) await supabase.storage.from('trip-photos').upload(thumbPath(path), small.body, { contentType: 'image/jpeg', upsert: false });
        const { error } = await supabase.from('photos').insert({ id, trip_id: t.tripId, member_id: meId, path, taken_on: takenOn, width: f.width ?? small?.fullW, height: f.height ?? small?.fullH });
        if (error) { showError('사진 올리기 실패', new Error(error.message)); continue; }
        setUrls((u) => ({ ...u, ...(small ? { [thumbPath(path)]: small.preview } : {}) }));
      }
      done++; onProgress?.(done);
    }
    await t.reload();
    return done;
  };
  const setCaption = (p: Photo, caption: string) =>
    t.write((xs) => xs.map((x) => (x.id === p.id ? { ...x, caption } : x)), () => supabase.from('photos').update({ caption: caption || null }).eq('id', p.id), '설명 저장');
  const remove = async (p: Photo) => {
    const ok = await t.write((xs) => xs.filter((x) => x.id !== p.id), () => supabase.from('photos').delete().eq('id', p.id), '사진 지우기');
    if (ok && !t.demo) await supabase.storage.from('trip-photos').remove([p.path, thumbPath(p.path)]);
  };
  return { photos, loaded: t.loaded, status: t.status, savedAt: t.savedAt, upload, setCaption, remove };
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };

/** 고른 파일 그대로 (다시 압축하지 않는다) */
async function original(f: Picked): Promise<{ body: Blob | ArrayBuffer; type: string; ext: string }> {
  if (Platform.OS !== 'web') {
    const body = await (await fetch(f.uri)).arrayBuffer();
    const type = f.mimeType ?? 'image/jpeg';
    return { body, type, ext: EXT[type] ?? 'jpg' };
  }
  const body = f.file ?? (await (await fetch(f.uri)).blob());
  const type = body.type || f.mimeType || 'image/jpeg';
  const fromName = f.fileName?.split('.').pop()?.toLowerCase();
  return { body, type, ext: EXT[type] ?? (fromName && fromName.length <= 4 ? fromName : 'jpg') };
}

/** 앨범용 미리보기: 긴 변 1200px JPEG (웹에서만 만든다). 못 읽는 형식이면 없음 */
async function thumbnail(body: Blob | ArrayBuffer, f: Picked): Promise<{ body: Blob; width: number; height: number; fullW: number; fullH: number; preview: string } | undefined> {
  if (Platform.OS !== 'web' || !(body instanceof Blob)) return undefined;
  try {
    const bmp = await createImageBitmap(body, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('미리보기 실패'))), 'image/jpeg', 0.85));
    return { body: blob, width: w, height: h, fullW: bmp.width, fullH: bmp.height, preview: URL.createObjectURL(blob) };
  } catch {
    return undefined;
  }
}
