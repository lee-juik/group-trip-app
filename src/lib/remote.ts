import { RealtimeChannel } from '@supabase/supabase-js';
import { Category, Flight, PlaceCard, TransitLeg, Trip, TripDay, Vote } from '../types';
import { supabase } from './supabase';

const must = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

/** 서버에서 여행 하나를 통째로 읽어서 화면이 쓰는 모양으로 바꾼다 */
export async function loadTrip(tripId: string, userId: string): Promise<{ trip: Trip; meId: string } | null> {
  const eq = { col: 'trip_id', id: tripId };
  const [tripRow, members, places, wants, votes, status, days, items] = await Promise.all([
    supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
    supabase.from('members').select('id,name,user_id').eq(eq.col, eq.id).order('joined_at'),
    supabase.from('places').select('*').eq(eq.col, eq.id).order('created_at', { ascending: false }),
    supabase.from('place_wants').select('place_id,member_id').eq(eq.col, eq.id),
    supabase.from('votes').select('*').eq(eq.col, eq.id).order('created_at', { ascending: false }),
    supabase.rpc('vote_status', { p_trip: tripId }),
    supabase.from('days').select('*').eq(eq.col, eq.id).order('date'),
    supabase.from('plan_items').select('*').eq(eq.col, eq.id).order('time'),
  ]);
  const t = must(tripRow);
  if (!t) return null;
  const ms = must(members) ?? [];
  const me = ms.find((m) => m.user_id === userId);
  if (!me) return null;

  const wantMap: Record<string, string[]> = {};
  (must(wants) ?? []).forEach((w) => (wantMap[w.place_id] ??= []).push(w.member_id));

  const statusMap: Record<string, { voted_member_ids: string[]; my_choice: string | null; counts: Record<string, number> | null }> = {};
  (must(status) ?? []).forEach((s: { vote_id: string; voted_member_ids: string[]; my_choice: string | null; counts: Record<string, number> | null }) => (statusMap[s.vote_id] = s));

  const itemsByDay: Record<string, TripDay['items']> = {};
  (must(items) ?? []).forEach((it) =>
    (itemsByDay[it.day_id] ??= []).push({
      id: it.id, time: it.time, title: it.title, placeId: it.place_id ?? undefined, note: it.note ?? undefined,
      transitIn: (it.transit_in as TransitLeg) ?? undefined,
    }),
  );

  const trip: Trip = {
    id: t.id,
    title: t.title,
    city: t.city,
    inviteCode: t.invite_code,
    joinLocked: !!t.join_locked,
    hostId: (ms.find((m) => m.user_id === t.created_by) ?? ms[0])?.id,
    members: ms.map((m) => ({ id: m.id, name: m.name })),
    places: (must(places) ?? []).map(
      (p): PlaceCard => ({
        id: p.id, name: p.name, category: p.category as Category, summary: p.summary, area: p.area,
        sourceUrl: p.source_url ?? undefined, emoji: p.emoji ?? undefined, lat: p.lat ?? undefined, lng: p.lng ?? undefined, addedBy: p.added_by, wantedBy: wantMap[p.id] ?? [],
      }),
    ),
    votes: (must(votes) ?? []).map((v): Vote => {
      const s = statusMap[v.id];
      return {
        id: v.id, title: v.title, kind: v.kind, optionIds: v.option_ids, deadline: v.deadline, closed: v.closed,
        voters: s?.voted_member_ids ?? [], myChoice: s?.my_choice ?? undefined, counts: s?.counts ?? undefined,
      };
    }),
    days: (must(days) ?? []).map((d) => ({
      id: d.id, date: d.date, outbound: (d.outbound as Flight) ?? undefined, inbound: (d.inbound as Flight) ?? undefined, items: itemsByDay[d.id] ?? [],
    })),
  };
  return { trip, meId: me.id };
}

/**
 * 친구가 뭔가 바꾸면 바로 알려주는 실시간 구독. 바뀔 때마다 onChange가 불린다.
 * 연결이 (다시) 붙을 때는 onConnected가 불린다 (끊긴 동안 놓친 변경을 다시 읽기 위해)
 */
export function subscribeTrip(tripId: string, onChange: () => void, onConnected?: () => void): RealtimeChannel {
  const ch = supabase.channel(`trip-${tripId}`);
  for (const table of ['members', 'places', 'place_wants', 'votes', 'days', 'plan_items']) {
    ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `trip_id=eq.${tripId}` }, onChange);
  }
  ch.on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, onChange);
  return ch.subscribe((status) => { if (status === 'SUBSCRIBED') onConnected?.(); });
}

export async function createTrip(p: { title: string; city: string; start: string; end: string; name: string }): Promise<string> {
  return must(await supabase.rpc('create_trip', { p_title: p.title, p_city: p.city, p_start: p.start, p_end: p.end, p_name: p.name })) as string;
}

export async function joinTrip(code: string, name: string): Promise<string> {
  const r = await supabase.rpc('join_trip', { p_code: code, p_name: name });
  if (r.error?.message.includes('invalid code')) throw new Error('초대 코드를 다시 확인해 주세요. 방장이 입장을 막아 둔 방일 수도 있어요.');
  return must(r) as string;
}

/** 방장이 멤버를 내보낸다 (서버에서 방장인지 다시 확인함) */
export async function removeMember(memberId: string) {
  const { data, error } = await supabase.functions.invoke('remove-member', { body: { memberId } });
  if (error || data?.error) throw new Error(data?.error ?? error?.message ?? '내보내기 실패');
}

/** 방장이 새 멤버 입장을 막거나 다시 연다 */
export async function setJoinLocked(tripId: string, locked: boolean) {
  must(await supabase.rpc('set_join_locked', { p_trip: tripId, p_locked: locked }));
}
