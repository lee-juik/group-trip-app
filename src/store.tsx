import React, { createContext, useContext, useReducer } from 'react';
import { sampleTrip } from './data/sample';
import { Category, Flight, PlaceCard, TransitLeg, Trip, Vote } from './types';

interface State {
  trip: Trip;
  meId: string;
}

type Action =
  | { type: 'setMe'; memberId: string }
  | { type: 'addPlace'; place: Omit<PlaceCard, 'id' | 'addedBy' | 'wantedBy'> }
  | { type: 'toggleWant'; placeId: string }
  | { type: 'createVote'; title: string; optionIds: string[]; deadline: string }
  | { type: 'castVote'; voteId: string; optionId: string }
  | { type: 'closeVote'; voteId: string }
  | { type: 'addPlanItem'; dayIndex: number; time: string; title: string; placeId?: string }
  | { type: 'removePlanItem'; dayIndex: number; itemId: string }
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
        ballots: {},
        closed: false,
      };
      return update({ votes: [vote, ...trip.votes] });
    }

    case 'castVote':
      return update({
        votes: trip.votes.map((v) =>
          v.id === action.voteId && !v.closed ? { ...v, ballots: { ...v.ballots, [meId]: action.optionId } } : v,
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

const Ctx = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { trip: sampleTrip, meId: 'm1' });
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useTrip() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTrip must be used inside TripProvider');
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
