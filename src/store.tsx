import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { createTrip, joinTrip, loadTrip, setJoinLocked, subscribeTrip } from './lib/remote';
import { ensureSignedIn, supabase } from './lib/supabase';
import { friendly, normTime, showError, uuid } from './lib/util';
import { sampleTrip } from './data/sample';
import { Flight, PlaceCard, PlaceInput, TransitLeg, Trip, Vote } from './types';

export interface State {
  trip: Trip;
  meId: string;
}

export type Action =
  | { type: 'setMe'; memberId: string }
  | { type: 'addPlace'; place: PlaceInput; id?: string }
  | { type: 'registerPlace'; place: PlaceInput; dayIndex?: number; time?: string; id?: string; itemId?: string }
  | { type: 'updatePlace'; placeId: string; patch: Partial<PlaceInput> }
  | { type: 'removePlace'; placeId: string }
  | { type: 'toggleWant'; placeId: string }
  | { type: 'createVote'; title: string; optionIds: string[]; deadline: string; id?: string }
  | { type: 'castVote'; voteId: string; optionId: string }
  | { type: 'closeVote'; voteId: string }
  | { type: 'addPlanItem'; dayIndex: number; time: string; title: string; placeId?: string; note?: string; id?: string }
  | { type: 'addPlanItems'; dayIndex: number; items: { id?: string; time: string; title: string; placeId?: string }[] }
  | { type: 'updatePlanItem'; dayIndex: number; itemId: string; patch: { time?: string; title?: string; note?: string } }
  | { type: 'removePlanItem'; dayIndex: number; itemId: string }
  | { type: 'reorderDay'; dayIndex: number; changes: { itemId: string; time: string; clearTransit: boolean }[] }
  | { type: 'setTransit'; dayIndex: number; itemId: string; leg: TransitLeg | undefined }
  | { type: 'setFlight'; dayIndex: number; direction: 'outbound' | 'inbound'; flight: Flight | undefined }
  | { type: 'setJoinLocked'; locked: boolean };

/** 화면과 서버가 같은 id를 쓰도록, 새로 만드는 항목의 id를 미리 채운다 */
function withIds(a: Action): Action {
  switch (a.type) {
    case 'addPlace': return { ...a, id: a.id ?? uuid() };
    case 'registerPlace': return { ...a, id: a.id ?? uuid(), itemId: a.itemId ?? uuid() };
    case 'createVote': return { ...a, id: a.id ?? uuid() };
    case 'addPlanItem': return { ...a, id: a.id ?? uuid() };
    case 'addPlanItems': return { ...a, items: a.items.map((x) => ({ ...x, id: x.id ?? uuid() })) };
    default: return a;
  }
}

const nameKey = (s: string) => s.replace(/\s/g, '').toLowerCase();
const sortByTime = <T extends { time: string }>(xs: T[]) => [...xs].sort((a, b) => a.time.localeCompare(b.time));
const fixTime = (s: string) => normTime(s) ?? s;

export function reducer(state: State, action: Action): State {
  const { trip, meId } = state;
  const update = (t: Partial<Trip>): State => ({ ...state, trip: { ...trip, ...t } });

  switch (action.type) {
    case 'setMe':
      return { ...state, meId: action.memberId };

    case 'addPlace': {
      // 같은 이름의 장소가 이미 있으면 새로 만들지 않고 "가고 싶다"를 더하고, 비어 있던 메모·링크를 채운다 (중복 합치기)
      const dup = trip.places.find((p) => nameKey(p.name) === nameKey(action.place.name));
      if (dup) {
        return update({
          places: trip.places.map((p) => (p.id !== dup.id ? p : {
            ...p,
            summary: p.summary || action.place.summary,
            area: p.area || action.place.area,
            sourceUrl: p.sourceUrl || action.place.sourceUrl,
            lat: p.lat ?? action.place.lat, lng: p.lng ?? action.place.lng,
            wantedBy: p.wantedBy.includes(meId) ? p.wantedBy : [...p.wantedBy, meId],
          })),
        });
      }
      const place: PlaceCard = { ...action.place, id: action.id ?? uuid(), addedBy: meId, wantedBy: [meId] };
      return update({ places: [place, ...trip.places] });
    }

    case 'registerPlace': {
      const withPlace = reducer(state, { type: 'addPlace', place: action.place, id: action.id });
      if (action.dayIndex == null || !action.time) return withPlace;
      const p = withPlace.trip.places.find((x) => nameKey(x.name) === nameKey(action.place.name))!;
      return reducer(withPlace, { type: 'addPlanItem', dayIndex: action.dayIndex, time: action.time, title: p.name, placeId: p.id, id: action.itemId });
    }

    case 'updatePlace':
      return update({
        places: trip.places.map((p) => (p.id === action.placeId ? { ...p, ...action.patch } : p)),
        // 일정에 들어간 제목도 같이 바꾼다
        days: action.patch.name
          ? trip.days.map((d) => ({ ...d, items: d.items.map((it) => (it.placeId === action.placeId ? { ...it, title: action.patch.name! } : it)) }))
          : trip.days,
      });

    case 'removePlace':
      return update({
        places: trip.places.filter((p) => p.id !== action.placeId),
        days: trip.days.map((d) => ({ ...d, items: d.items.map((it) => (it.placeId === action.placeId ? { ...it, placeId: undefined } : it)) })),
      });

    case 'toggleWant':
      return update({
        places: trip.places.map((p) =>
          p.id !== action.placeId
            ? p
            : { ...p, wantedBy: p.wantedBy.includes(meId) ? p.wantedBy.filter((m) => m !== meId) : [...p.wantedBy, meId] },
        ),
      });

    case 'createVote': {
      const vote: Vote = {
        id: action.id ?? uuid(),
        title: action.title,
        kind: action.optionIds.length === 1 ? 'yesno' : 'single',
        optionIds: action.optionIds,
        deadline: action.deadline,
        voters: [],
        _ballots: {},
        closed: false,
      };
      return update({ votes: [vote, ...trip.votes] });
    }

    case 'castVote':
      return update({
        votes: trip.votes.map((v) =>
          v.id === action.voteId && !v.closed
            ? { ...v, _ballots: { ...v._ballots, [meId]: action.optionId }, myChoice: action.optionId, voters: v.voters.includes(meId) ? v.voters : [...v.voters, meId] }
            : v,
        ),
      });

    case 'closeVote':
      return update({ votes: trip.votes.map((v) => (v.id === action.voteId ? { ...v, closed: true } : v)) });

    case 'addPlanItem':
      return update({
        days: trip.days.map((d, i) =>
          i !== action.dayIndex
            ? d
            : { ...d, items: sortByTime([...d.items, { id: action.id ?? uuid(), time: fixTime(action.time), title: action.title, placeId: action.placeId, note: action.note }]) },
        ),
      });

    case 'addPlanItems':
      return update({
        days: trip.days.map((d, i) => (i !== action.dayIndex ? d : { ...d, items: sortByTime([...d.items, ...action.items.map((x) => ({ ...x, id: x.id ?? uuid(), time: fixTime(x.time) }))]) })),
      });

    case 'updatePlanItem':
      return update({
        days: trip.days.map((d, i) => (i !== action.dayIndex ? d : {
          ...d,
          items: sortByTime(d.items.map((it) => (it.id !== action.itemId ? it : { ...it, ...action.patch, time: action.patch.time ? fixTime(action.patch.time) : it.time }))),
        })),
      });

    case 'reorderDay':
      return update({
        days: trip.days.map((d, i) => {
          if (i !== action.dayIndex) return d;
          return { ...d, items: sortByTime(d.items.map((it) => {
            const ch = action.changes.find((c) => c.itemId === it.id);
            return ch ? { ...it, time: ch.time, transitIn: ch.clearTransit ? undefined : it.transitIn } : it;
          })) };
        }),
      });

    case 'removePlanItem':
      return update({
        days: trip.days.map((d, i) => (i !== action.dayIndex ? d : { ...d, items: d.items.filter((it) => it.id !== action.itemId) })),
      });

    case 'setTransit':
      return update({
        days: trip.days.map((d, i) =>
          i !== action.dayIndex
            ? d
            : { ...d, items: d.items.map((it) => (it.id === action.itemId ? { ...it, transitIn: action.leg } : it)) },
        ),
      });

    case 'setFlight':
      return update({
        days: trip.days.map((d, i) => (i !== action.dayIndex ? d : { ...d, [action.direction]: action.flight })),
      });

    case 'setJoinLocked':
      return update({ joinLocked: action.locked });
  }
}

/** 샘플 모드: 진짜 투표 내역(_ballots)으로 '누가 투표했는지/내 선택/공개된 결과'를 계산한다 */
function revealDemo(state: State): State {
  const total = state.trip.members.length;
  return {
    ...state,
    trip: {
      ...state.trip,
      votes: state.trip.votes.map((v) => {
        const b = v._ballots ?? {};
        const voters = Object.keys(b);
        const open = v.closed || voters.length >= total || Date.parse(v.deadline) < Date.now();
        const counts: Record<string, number> = {};
        Object.values(b).forEach((o) => (counts[o] = (counts[o] ?? 0) + 1));
        return { ...v, voters, myChoice: b[state.meId], counts: open ? counts : undefined };
      }),
    },
  };
}

/** 서버에 실제로 반영한다. 실패하면 에러를 던진다. state는 이 동작을 적용하기 전의 상태 */
async function sendToServer(state: State, a: Action) {
  const { trip, meId } = state;
  const ok = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); };
  const dayId = (i: number) => trip.days[i]?.id!;
  switch (a.type) {
    case 'setMe':
      return;
    case 'registerPlace':
    case 'addPlace': {
      const dup = trip.places.find((p) => nameKey(p.name) === nameKey(a.place.name));
      let placeId = dup?.id;
      if (dup) {
        // 비어 있던 칸만 새 값으로 채운다
        const patch: Record<string, unknown> = {};
        if (!dup.summary && a.place.summary) patch.summary = a.place.summary;
        if (!dup.area && a.place.area) patch.area = a.place.area;
        if (!dup.sourceUrl && a.place.sourceUrl) patch.source_url = a.place.sourceUrl;
        if (dup.lat == null && a.place.lat != null) { patch.lat = a.place.lat; patch.lng = a.place.lng; }
        if (Object.keys(patch).length) ok(await supabase.from('places').update(patch).eq('id', dup.id));
      } else {
        const r = await supabase.from('places').insert({
          id: a.id, trip_id: trip.id, name: a.place.name, category: a.place.category, summary: a.place.summary, area: a.place.area,
          source_url: a.place.sourceUrl ?? null, emoji: a.place.emoji ?? null, lat: a.place.lat ?? null, lng: a.place.lng ?? null, added_by: meId,
        }).select('id').single();
        ok(r);
        placeId = r.data!.id;
      }
      ok(await supabase.from('place_wants').upsert({ place_id: placeId, member_id: meId, trip_id: trip.id }, { ignoreDuplicates: true }));
      if (a.type === 'registerPlace' && a.dayIndex != null && a.time) {
        ok(await supabase.from('plan_items').insert({ id: a.itemId, trip_id: trip.id, day_id: dayId(a.dayIndex), time: fixTime(a.time), title: a.place.name, place_id: placeId }));
      }
      return;
    }
    case 'updatePlace': {
      const p = a.patch;
      ok(await supabase.from('places').update({
        ...(p.name != null && { name: p.name }), ...(p.category != null && { category: p.category }), ...(p.summary != null && { summary: p.summary }),
        ...(p.area != null && { area: p.area }), ...('sourceUrl' in p && { source_url: p.sourceUrl ?? null }), ...(p.emoji != null && { emoji: p.emoji }),
        ...('lat' in p && { lat: p.lat ?? null, lng: p.lng ?? null }),
      }).eq('id', a.placeId));
      if (p.name != null) ok(await supabase.from('plan_items').update({ title: p.name }).eq('place_id', a.placeId));
      return;
    }
    case 'removePlace':
      return ok(await supabase.from('places').delete().eq('id', a.placeId));
    case 'toggleWant': {
      const on = trip.places.find((p) => p.id === a.placeId)?.wantedBy.includes(meId);
      return ok(on
        ? await supabase.from('place_wants').delete().match({ place_id: a.placeId, member_id: meId })
        : await supabase.from('place_wants').upsert({ place_id: a.placeId, member_id: meId, trip_id: trip.id }, { ignoreDuplicates: true }));
    }
    case 'createVote':
      return ok(await supabase.from('votes').insert({
        id: a.id, trip_id: trip.id, title: a.title, kind: a.optionIds.length === 1 ? 'yesno' : 'single', option_ids: a.optionIds, deadline: a.deadline, created_by: meId,
      }));
    case 'castVote':
      return ok(await supabase.rpc('cast_ballot', { p_vote: a.voteId, p_choice: a.optionId }));
    case 'closeVote':
      return ok(await supabase.from('votes').update({ closed: true }).eq('id', a.voteId));
    case 'addPlanItem':
      return ok(await supabase.from('plan_items').insert({ id: a.id, trip_id: trip.id, day_id: dayId(a.dayIndex), time: fixTime(a.time), title: a.title, place_id: a.placeId ?? null, note: a.note ?? null }));
    case 'addPlanItems':
      return ok(await supabase.from('plan_items').insert(a.items.map((x) => ({ id: x.id, trip_id: trip.id, day_id: dayId(a.dayIndex), time: fixTime(x.time), title: x.title, place_id: x.placeId ?? null }))));
    case 'updatePlanItem': {
      const p = a.patch;
      return ok(await supabase.from('plan_items').update({
        ...(p.time != null && { time: fixTime(p.time) }), ...(p.title != null && { title: p.title }), ...('note' in p && { note: p.note || null }),
      }).eq('id', a.itemId));
    }
    case 'reorderDay': {
      // 한 번의 요청으로 전부 바꾼다 (중간에 끊겨도 반만 바뀌는 일이 없다)
      const day = trip.days[a.dayIndex];
      const rows = a.changes.map((ch) => {
        const it = day.items.find((x) => x.id === ch.itemId)!;
        return { id: it.id, trip_id: trip.id, day_id: day.id, time: ch.time, title: it.title, place_id: it.placeId ?? null, note: it.note ?? null, transit_in: ch.clearTransit ? null : it.transitIn ?? null };
      });
      return ok(await supabase.from('plan_items').upsert(rows, { onConflict: 'id' }));
    }
    case 'removePlanItem':
      return ok(await supabase.from('plan_items').delete().eq('id', a.itemId));
    case 'setTransit':
      return ok(await supabase.from('plan_items').update({ transit_in: a.leg ?? null }).eq('id', a.itemId));
    case 'setFlight':
      return ok(await supabase.from('days').update({ [a.direction]: a.flight ?? null }).eq('id', dayId(a.dayIndex)));
    case 'setJoinLocked':
      return setJoinLocked(trip.id, a.locked);
  }
}

const TRIP_KEY = 'currentTripId';
const cacheKey = (id: string) => `trip-cache:${id}`;
const RETRY_DELAYS = [2000, 5000, 15000, 30000];

export type Mode = 'loading' | 'welcome' | 'demo' | 'remote';
/** ok: 서버와 맞음 / offline: 서버에 못 닿아 마지막 저장본을 보는 중 */
export interface SyncState { status: 'ok' | 'offline'; lastAt?: number; message?: string }

interface SessionApi {
  mode: Mode;
  error?: string;
  sync: SyncState;
  startDemo: () => void;
  create: (p: { title: string; city: string; start: string; end: string; name: string }) => Promise<void>;
  join: (code: string, name: string) => Promise<void>;
  leave: () => void;
  retry: () => void;
}

const Ctx = createContext<{ state: State; dispatch: (a: Action) => void } | null>(null);
const SessionCtx = createContext<SessionApi | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('loading');
  const [error, setError] = useState<string>();
  const [sync, setSync] = useState<SyncState>({ status: 'ok' });
  const [state, setStateRaw] = useState<State | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const userId = useRef<string>('');
  const stateRef = useRef<State | null>(null);
  const seq = useRef(0);          // 새로고침 순번: 늦게 온 옛 응답은 버린다
  const writes = useRef(0);       // 저장 중인 요청 수: 저장 중엔 새로고침 결과를 덮어쓰지 않는다
  const attempts = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refreshRef = useRef<() => void>(() => {});

  const setState = (s: State | null) => { stateRef.current = s; setStateRaw(s); };

  // 앱 시작: 마지막으로 보던 여행이 있으면 저장본을 먼저 띄우고, 로그인 → 서버에서 다시 읽는다
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(TRIP_KEY);
      if (saved) {
        const cached = await AsyncStorage.getItem(cacheKey(saved));
        if (cached) {
          try { const c = JSON.parse(cached) as { state: State; at: number }; setState(c.state); setSync({ status: 'offline', lastAt: c.at }); } catch { /* 저장본이 깨졌으면 무시 */ }
        }
        setTripId(saved);
        setMode('remote');
      }
      try {
        userId.current = await ensureSignedIn();
      } catch (e) {
        if (!saved) setError(friendly(e));
        else setSync((s) => ({ ...s, status: 'offline', message: friendly(e) }));
      }
      if (!saved) setMode('welcome');
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    clearTimeout(retryTimer.current);
    const my = ++seq.current;
    try {
      if (!userId.current) userId.current = await ensureSignedIn();
      const r = await loadTrip(tripId, userId.current);
      if (my !== seq.current) return; // 더 최신 요청이 있다
      if (!r) {
        // 방이 없거나 내가 멤버가 아니다 (내보내졌거나, 다른 기기에서 같은 이름으로 들어와 자리를 가져갔거나)
        await AsyncStorage.multiRemove([TRIP_KEY, cacheKey(tripId)]);
        setTripId(null); setState(null); setMode('welcome');
        setError('이 여행방에 내 자리가 없어요. 다른 기기에서 같은 이름으로 들어왔거나 내보내진 경우예요. 초대 코드와 같은 이름으로 다시 들어오면 그대로 이어져요.');
        return;
      }
      attempts.current = 0;
      if (writes.current > 0) return; // 저장이 끝나면 다시 읽으니 지금 결과는 버린다
      setState(r);
      setSync({ status: 'ok', lastAt: Date.now() });
      AsyncStorage.setItem(cacheKey(tripId), JSON.stringify({ state: r, at: Date.now() })).catch(() => {});
    } catch (e) {
      if (my !== seq.current) return;
      setSync((s) => ({ status: 'offline', lastAt: s.lastAt, message: friendly(e) }));
      const d = RETRY_DELAYS[Math.min(attempts.current++, RETRY_DELAYS.length - 1)];
      retryTimer.current = setTimeout(() => refreshRef.current(), d);
    }
  }, [tripId]);
  refreshRef.current = refresh;

  // 실시간: 친구가 바꾸면 잠깐 모았다가 다시 읽는다. 앱으로 돌아올 때, 인터넷이 돌아올 때, 연결이 다시 붙을 때도 다시 읽는다
  useEffect(() => {
    if (mode !== 'remote' || !tripId) return;
    refresh();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => { clearTimeout(timer); timer = setTimeout(refresh, 250); };
    const ch = subscribeTrip(tripId, bump, bump);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const online = () => refresh();
    if (Platform.OS === 'web') window.addEventListener('online', online);
    const tick = setInterval(refresh, 60_000); // 투표 마감 시간이 지나면 결과가 열리도록
    return () => {
      clearTimeout(timer); clearInterval(tick); clearTimeout(retryTimer.current); supabase.removeChannel(ch); sub.remove();
      if (Platform.OS === 'web') window.removeEventListener('online', online);
    };
  }, [mode, tripId, refresh]);

  const dispatch = useCallback((raw: Action) => {
    const cur = stateRef.current;
    if (!cur) return;
    const a = withIds(raw);
    const next = mode === 'demo' ? revealDemo(reducer(cur, a)) : reducer(cur, a);
    setState(next); // 화면엔 먼저 반영하고 (stateRef도 바로 바꿔서 연달아 눌러도 앞의 변경이 안 사라진다)
    if (mode === 'demo') return;
    writes.current++;
    sendToServer(cur, a) // 서버에 저장한 뒤 진짜 값으로 맞춘다
      .catch((e) => showError('앗, 저장이 안 됐어요', e))
      .finally(() => { writes.current--; refresh(); });
  }, [mode, refresh]);

  const open = async (id: string) => {
    await AsyncStorage.setItem(TRIP_KEY, id);
    setSync({ status: 'ok' });
    setTripId(id);
    setMode('remote');
  };

  const session: SessionApi = useMemo(() => ({
    mode,
    error,
    sync,
    startDemo: () => { setState(revealDemo({ trip: sampleTrip, meId: 'm1' })); setMode('demo'); },
    create: async (p) => { setError(undefined); userId.current = await ensureSignedIn(); await open(await createTrip(p)); },
    join: async (code, name) => { setError(undefined); userId.current = await ensureSignedIn(); await open(await joinTrip(code, name)); },
    leave: () => {
      AsyncStorage.removeItem(TRIP_KEY);
      if (tripId) AsyncStorage.removeItem(cacheKey(tripId));
      setTripId(null); setState(null); setMode('welcome');
    },
    retry: () => { attempts.current = 0; refresh(); },
  }), [mode, error, sync, tripId, refresh]);

  return (
    <SessionCtx.Provider value={session}>
      <Ctx.Provider value={state ? { state, dispatch } : null}>{children}</Ctx.Provider>
    </SessionCtx.Provider>
  );
}

/** 여행 화면 안에서만 쓴다 (여행이 열려 있을 때) */
export function useTrip() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTrip must be used inside an open trip');
  return v;
}

export const useHasTrip = () => useContext(Ctx) !== null;

export function useSession() {
  const v = useContext(SessionCtx);
  if (!v) throw new Error('useSession must be used inside TripProvider');
  return v;
}
