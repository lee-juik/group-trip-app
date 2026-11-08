import { PlaceCard, PlanItem, Trip, TripDay } from '../types';

export type LatLng = { lat: number; lng: number };
const R = 6371;
export function km(a: LatLng, b: LatLng) {
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** 대충 이동 시간(분): 1.2km까지는 걷고, 그 이상은 대중교통 */
export const travelMin = (d: number) => (d <= 1.2 ? Math.round((d / 4.5) * 60) : Math.round(12 + (d / 22) * 60));

const pos = (p?: PlaceCard): LatLng | undefined => (p?.lat != null && p?.lng != null ? { lat: p.lat, lng: p.lng } : undefined);
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const toHm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** 밥·숙소·이동처럼 시간이 정해진 일정은 그 자리에 둔다 */
const PINNED = /점심|저녁|조식|아침|석식|체크인|체크아웃|공항|도착|출발|셔틀|코인로커|짐/;
const isPinned = (it: PlanItem, p?: PlaceCard) => !pos(p) || PINNED.test(it.title) || p?.category === '숙소' || p?.category === '교통';

function bestOrder<T>(xs: T[], at: (x: T) => LatLng, start?: LatLng, end?: LatLng): T[] {
  const cost = (order: T[]) => {
    let s = 0; let cur = start;
    for (const x of order) { if (cur) s += km(cur, at(x)); cur = at(x); }
    if (cur && end) s += km(cur, end);
    return s;
  };
  if (xs.length <= 1) return xs;
  if (xs.length <= 7) {
    let best = xs; let bestC = cost(xs);
    const perm = (rest: T[], acc: T[]) => {
      if (!rest.length) { const c = cost(acc); if (c < bestC - 1e-9) { bestC = c; best = acc; } return; }
      rest.forEach((x, i) => perm([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, x]));
    };
    perm(xs, []);
    return best;
  }
  // 많으면 가까운 곳부터
  const left = [...xs]; const out: T[] = []; let cur = start ?? at(left[0]);
  while (left.length) {
    let bi = 0; left.forEach((x, i) => { if (km(cur, at(x)) < km(cur, at(left[bi]))) bi = i; });
    cur = at(left[bi]); out.push(left.splice(bi, 1)[0]);
  }
  return out;
}

/** 그날 이동 거리 합 (km) */
export function dayDistance(day: TripDay, trip: Trip) {
  const pts = day.items.map((it) => pos(trip.places.find((p) => p.id === it.placeId))).filter(Boolean) as LatLng[];
  return pts.slice(1).reduce((s, p, i) => s + km(pts[i], p), 0);
}

/** 그날 묵는/출발하는 숙소 위치 */
function startOfDay(trip: Trip, dayIndex: number): LatLng | undefined {
  const day = trip.days[dayIndex];
  const hotelOf = (d?: TripDay) => d?.items.map((it) => trip.places.find((p) => p.id === it.placeId)).filter((p) => p?.category === '숙소').map(pos).filter(Boolean).pop();
  return pos(trip.places.find((p) => p.id === day.items[0]?.placeId)) ?? hotelOf(trip.days[dayIndex - 1]) ?? hotelOf(day);
}

export interface Reorder { changes: { itemId: string; time: string; clearTransit: boolean }[]; before: number; after: number; preview: { time: string; title: string; moved: boolean }[] }

/** 시간이 정해진 일정 사이에 있는 자유 일정들을 가까운 순서로 다시 놓는다 */
export function optimizeDay(trip: Trip, dayIndex: number): Reorder {
  const day = trip.days[dayIndex];
  const items = [...day.items].sort((a, b) => a.time.localeCompare(b.time));
  const placeOf = (it: PlanItem) => trip.places.find((p) => p.id === it.placeId);
  const result: PlanItem[] = [];
  let i = 0; let lastPos = startOfDay(trip, dayIndex);
  while (i < items.length) {
    if (isPinned(items[i], placeOf(items[i]))) { result.push(items[i]); lastPos = pos(placeOf(items[i])) ?? lastPos; i++; continue; }
    const run: PlanItem[] = [];
    while (i < items.length && !isPinned(items[i], placeOf(items[i]))) run.push(items[i++]);
    const endPos = items.slice(i).map((x) => pos(placeOf(x))).find(Boolean);
    const ordered = bestOrder(run, (x) => pos(placeOf(x))!, lastPos, endPos);
    const slots = run.map((x) => x.time);
    ordered.forEach((x, k) => result.push({ ...x, time: slots[k] }));
    lastPos = pos(placeOf(ordered[ordered.length - 1])) ?? lastPos;
  }
  const changes = result.filter((x) => items.find((o) => o.id === x.id)!.time !== x.time).map((x) => ({ itemId: x.id, time: x.time, clearTransit: true }));
  const after = dayDistance({ ...day, items: [...result].sort((a, b) => a.time.localeCompare(b.time)) }, trip);
  return {
    changes, before: dayDistance({ ...day, items }, trip), after,
    preview: [...result].sort((a, b) => a.time.localeCompare(b.time)).map((x) => ({ time: x.time, title: x.title, moved: changes.some((c) => c.itemId === x.id) })),
  };
}

/** 고른 장소들을 동선 순서로 시간 배치해서 새 일정으로 만든다 */
export function planNewStops(trip: Trip, dayIndex: number, places: PlaceCard[], startTime: string) {
  const withPos = places.filter((p) => pos(p));
  const noPos = places.filter((p) => !pos(p));
  const ordered = bestOrder(withPos, (p) => pos(p)!, startOfDay(trip, dayIndex));
  let t = toMin(/^\d{1,2}:\d{2}$/.test(startTime) ? startTime : '10:00');
  let prev: LatLng | undefined;
  return [...ordered, ...noPos].map((p) => {
    const here = pos(p);
    if (prev && here) t += travelMin(km(prev, here));
    const out = { title: p.name, placeId: p.id, time: toHm(t) };
    t += p.category === '맛집' || p.category === '카페' ? 70 : 90;
    prev = here ?? prev;
    return out;
  });
}

/** 구글맵 경로 (그날 순서대로) */
export function mapsRoute(trip: Trip, day: TripDay) {
  const pts = [...day.items].sort((a, b) => a.time.localeCompare(b.time))
    .map((it) => pos(trip.places.find((p) => p.id === it.placeId)))
    .filter((p, i, arr): p is LatLng => !!p && (i === 0 || !arr[i - 1] || arr[i - 1]!.lat !== p.lat || arr[i - 1]!.lng !== p.lng));
  if (pts.length < 2) return undefined;
  return `https://www.google.com/maps/dir/${pts.map((p) => `${p.lat},${p.lng}`).join('/')}`;
}
