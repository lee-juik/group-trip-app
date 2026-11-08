import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { createTrip, joinTrip, loadTrip, subscribeTrip } from './lib/remote';
import { ensureSignedIn, supabase } from './lib/supabase';
import { sampleTrip } from './data/sample';
import { Category, Flight, PlaceCard, TransitLeg, Trip, Vote } from './types';

export interface State {
  trip: Trip;
  meId: string;
}

export type Action =
  | { type: 'setMe'; memberId: string }
  | { type: 'addPlace'; place: Omit<PlaceCard, 'id' | 'addedBy' | 'wantedBy'> }
  | { type: 'toggleWant'; placeId: string }
  | { type: 'createVote'; title: string; optionIds: string[]; deadline: string }
  | { type: 'castVote'; voteId: string; optionId: string }
  | { type: 'closeVote'; voteId: string }
  | { type: 'addPlanItem'; dayIndex: number; time: string; title: string; placeId?: string }
  | { type: 'removePlanItem'; dayIndex: number; itemId: string }
  | { type: 'addPlanItems'; dayIndex: number; items: { time: string; title: string; placeId?: string }[] }
  | { type: 'reorderDay'; dayIndex: number; changes: { itemId: string; time: string; clearTransit: boolean }[] }
  | { type: 'setTransit'; dayIndex: number; itemId: string; leg: TransitLeg | undefined }
  | { type: 'setFlight'; dayIndex: number; direction: 'outbound' | 'inbound'; flight: Flight };

let counter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

const sortByTime = <T extends { time: string }>(xs: T[]) => [...xs].sort((a, b) => a.time.localeCompare(b.time));

function reducer(state: State, action: Action): State {
  const { trip, meId } = state;
  const update = (t: Partial<Trip>): State => ({ ...state, trip: { ...trip, ...t } });

  switch (action.type) {
    case 'setMe':
      return { ...state, meId: action.memberId };

    case 'addPlace': {
      // 같은 이름의 장소가 이미 있으면 새로 만들지 않고 "가고 싶다"만 더한다 (중복 합치기)
      const key = action.place.name.replace(/\s/g, '').toLowerCase();
      const dup = trip.places.find((p) => p.name.replace(/\s/g, '').toLowerCase() === key);
      if (dup) {
        return update({
          places: trip.places.map((p) =>
            p.id === dup.id && !p.wantedBy.includes(meId) ? { ...p, wantedBy: [...p.wantedBy, meId] } : p,
          ),
        });
      }
      const place: PlaceCard = { ...action.place, id: newId('p'), addedBy: meId, wantedBy: [meId] };
      return update({ places: [place, ...trip.places] });
    }

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
        id: newId('v'),
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
            : { ...d, items: sortByTime([...d.items, { id: newId('i'), time: action.time, title: action.title, placeId: action.placeId }]) },
        ),
      });

    case 'addPlanItems':
      return update({
        days: trip.days.map((d, i) => (i !== action.dayIndex ? d : { ...d, items: sortByTime([...d.items, ...action.items.map((x) => ({ id: newId('i'), ...x }))]) })),
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

/** 서버에 실제로 반영한다. 실패하면 에러를 던진다 */
async function sendToServer(state: State, a: Action) {
  const { trip, meId } = state;
  const ok = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); };
  const dayId = (i: number) => trip.days[i]?.id!;
  switch (a.type) {
    case 'setMe':
      return;
    case 'addPlace': {
      const key = a.place.name.replace(/\s/g, '').toLowerCase();
      const dup = trip.places.find((p) => p.name.replace(/\s/g, '').toLowerCase() === key);
      let placeId = dup?.id;
      if (!placeId) {
        const r = await supabase.from('places').insert({
          trip_id: trip.id, name: a.place.name, category: a.place.category, summary: a.place.summary, area: a.place.area,
          source_url: a.place.sourceUrl ?? null, emoji: a.place.emoji ?? null, lat: a.place.lat ?? null, lng: a.place.lng ?? null, added_by: meId,
        }).select('id').single();
        ok(r);
        placeId = r.data!.id;
      }
      return ok(await supabase.from('place_wants').upsert({ place_id: placeId, member_id: meId, trip_id: trip.id }, { ignoreDuplicates: true }));
    }
    case 'toggleWant': {
      const on = trip.places.find((p) => p.id === a.placeId)?.wantedBy.includes(meId);
      return ok(on
        ? await supabase.from('place_wants').delete().match({ place_id: a.placeId, member_id: meId })
        : await supabase.from('place_wants').insert({ place_id: a.placeId, member_id: meId, trip_id: trip.id }));
    }
    case 'createVote':
      return ok(await supabase.from('votes').insert({
        trip_id: trip.id, title: a.title, kind: a.optionIds.length === 1 ? 'yesno' : 'single', option_ids: a.optionIds, deadline: a.deadline, created_by: meId,
      }));
    case 'castVote':
      return ok(await supabase.rpc('cast_ballot', { p_vote: a.voteId, p_choice: a.optionId }));
    case 'closeVote':
      return ok(await supabase.from('votes').update({ closed: true }).eq('id', a.voteId));
    case 'addPlanItem':
      return ok(await supabase.from('plan_items').insert({ trip_id: trip.id, day_id: dayId(a.dayIndex), time: a.time, title: a.title, place_id: a.placeId ?? null }));
    case 'addPlanItems':
      return ok(await supabase.from('plan_items').insert(a.items.map((x) => ({ trip_id: trip.id, day_id: dayId(a.dayIndex), time: x.time, title: x.title, place_id: x.placeId ?? null }))));
    case 'reorderDay':
      for (const ch of a.changes) {
        ok(await supabase.from('plan_items').update(ch.clearTransit ? { time: ch.time, transit_in: null } : { time: ch.time }).eq('id', ch.itemId));
      }
      return;
    case 'removePlanItem':
      return ok(await supabase.from('plan_items').delete().eq('id', a.itemId));
    case 'setTransit':
      return ok(await supabase.from('plan_items').update({ transit_in: a.leg ?? null }).eq('id', a.itemId));
    case 'setFlight':
      return ok(await supabase.from('days').update({ [a.direction]: a.flight }).eq('id', dayId(a.dayIndex)));
  }
}

const TRIP_KEY = 'currentTripId';

export type Mode = 'loading' | 'welcome' | 'demo' | 'remote';

interface SessionApi {
  mode: Mode;
  error?: string;
  startDemo: () => void;
  create: (p: { title: string; city: string; start: string; end: string; name: string }) => Promise<void>;
  join: (code: string, name: string) => Promise<void>;
  leave: () => void;
}

const Ctx = createContext<{ state: State; dispatch: (a: Action) => void } | null>(null);
const SessionCtx = createContext<SessionApi | null>(null);

const showError = (title: string, msg: string) => {
  if (Platform.OS === 'web') window.alert(`${title}\n${msg}`);
  else Alert.alert(title, msg);
};

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('loading');
  const [error, setError] = useState<string>();
  const [state, setState] = useState<State | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const userId = useRef<string>('');
  const stateRef = useRef(state);
  stateRef.current = state;

  // 앱 시작: 익명 로그인 → 마지막으로 보던 여행이 있으면 바로 열기
  useEffect(() => {
    (async () => {
      try {
        userId.current = await ensureSignedIn();
        const saved = await AsyncStorage.getItem(TRIP_KEY);
        if (saved) { setTripId(saved); setMode('remote'); } else setMode('welcome');
      } catch (e) {
        setError(`서버에 연결하지 못했어요. 인터넷을 확인해 주세요. (${(e as Error).message})`);
        setMode('welcome');
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    try {
      const r = await loadTrip(tripId, userId.current);
      if (!r) { await AsyncStorage.removeItem(TRIP_KEY); setTripId(null); setState(null); setMode('welcome'); return; }
      setState(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [tripId]);

  // 실시간: 친구가 바꾸면 잠깐 모았다가 다시 읽는다. 앱으로 돌아올 때도 다시 읽는다
  useEffect(() => {
    if (mode !== 'remote' || !tripId) return;
    refresh();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => { clearTimeout(timer); timer = setTimeout(refresh, 250); };
    const ch = subscribeTrip(tripId, bump);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const tick = setInterval(refresh, 60_000); // 투표 마감 시간이 지나면 결과가 열리도록
    return () => { clearTimeout(timer); clearInterval(tick); supabase.removeChannel(ch); sub.remove(); };
  }, [mode, tripId, refresh]);

  const dispatch = useCallback((a: Action) => {
    const cur = stateRef.current;
    if (!cur) return;
    if (mode === 'demo') { setState(revealDemo(reducer(cur, a))); return; }
    setState(reducer(cur, a)); // 화면엔 먼저 반영하고
    sendToServer(cur, a)       // 서버에 저장한 뒤 진짜 값으로 맞춘다
      .catch((e) => showError('앗, 저장이 안 됐어요', (e as Error).message))
      .finally(refresh);
  }, [mode, refresh]);

  const open = async (id: string) => {
    await AsyncStorage.setItem(TRIP_KEY, id);
    setTripId(id);
    setMode('remote');
  };

  const session: SessionApi = useMemo(() => ({
    mode,
    error,
    startDemo: () => { setState(revealDemo({ trip: sampleTrip, meId: 'm1' })); setMode('demo'); },
    create: async (p) => { setError(undefined); userId.current = await ensureSignedIn(); await open(await createTrip(p)); },
    join: async (code, name) => { setError(undefined); userId.current = await ensureSignedIn(); await open(await joinTrip(code, name)); },
    leave: () => { AsyncStorage.removeItem(TRIP_KEY); setTripId(null); setState(null); setMode('welcome'); },
  }), [mode, error]);

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

/** 공유받은 텍스트에서 장소 정보를 대충 추측한다. 나중에 AI 추출로 교체할 자리. */
export function guessFromSharedText(text: string): { name: string; category: Category; sourceUrl?: string; summary: string } {
  const url = text.match(/https?:\/\/\S+/)?.[0];
  const body = text.replace(/https?:\/\/\S+/g, '').trim();
  const firstLine = body.split('\n').map((s) => s.trim()).find(Boolean) ?? '';
  const name = (firstLine.match(/[📍@#]\s*([^\s#,]+(?:\s[^\s#,]+)?)/)?.[1] ?? firstLine).slice(0, 30);
  const rules: [RegExp, Category][] = [
    [/호텔|숙소|료칸|hotel|게스트하우스/i, '숙소'],
    [/카페|cafe|커피|디저트/i, '카페'],
    [/맛집|라멘|스시|카레|덮밥|고기|식당|먹/i, '맛집'],
    [/렌트|버스|JR|지하철|패스/i, '교통'],
    [/쇼핑|마켓|아울렛|돈키/i, '쇼핑'],
  ];
  const category = rules.find(([re]) => re.test(text))?.[1] ?? '관광지';
  return { name, category, sourceUrl: url, summary: body.slice(0, 80) };
}
