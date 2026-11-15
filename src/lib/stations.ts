import { TransitLeg } from '../types';

/** 노선 표시: 현지 표지판과 같은 색·기호 */
export interface LineInfo { code: string; name: string; color: string; fg?: string }

const LINES: { test: RegExp; info: LineInfo }[] = [
  { test: /난보쿠|南北/, info: { code: 'N', name: '난보쿠선', color: '#00A04B' } },
  { test: /도자이|東西/, info: { code: 'T', name: '도자이선', color: '#F08C00' } },
  { test: /도호|東豊/, info: { code: 'H', name: '도호선', color: '#0079C2' } },
  { test: /노면|市電|전차/, info: { code: '電', name: '노면전차', color: '#5C8A3A' } },
  { test: /에어포트|JR|하코다테|치토세|쾌속/, info: { code: 'JR', name: 'JR', color: '#2E9B48' } },
  { test: /셔틀/, info: { code: '🚌', name: '셔틀버스', color: '#C0663D' } },
];

export function lineOf(leg: TransitLeg): LineInfo | undefined {
  const s = `${leg.line ?? ''} ${leg.mode}`;
  return LINES.find((l) => l.test.test(s))?.info;
}

/** 역 이름: 한국어로 적어도 현지 표지판(일본어·영어)과 역 번호를 같이 보여준다 */
export interface StationInfo { ja: string; en: string; codes?: string[]; tip?: string; mapQuery?: string }

const STATIONS: Record<string, StationInfo> = {
  삿포로: { ja: '札幌 · さっぽろ', en: 'Sapporo', codes: ['JR', 'N06', 'H07'], mapQuery: '札幌駅' },
  호스이스스키노: { ja: '豊水すすきの', en: 'Hōsui-susukino', codes: ['H09'], tip: '스스키노역(난보쿠선)과 다른 역이에요. 도호선만 서요.', mapQuery: '豊水すすきの駅' },
  스스키노: { ja: 'すすきの', en: 'Susukino', codes: ['N08'], tip: '호스이스스키노역(도호선)과 다른 역이에요. 난보쿠선·노면전차가 서요.', mapQuery: 'すすきの駅' },
  오도리: { ja: '大通', en: 'Ōdōri', codes: ['N07', 'T09', 'H08'], mapQuery: '大通駅 札幌' },
  나카지마코엔: { ja: '中島公園', en: 'Nakajima-kōen', codes: ['N09'], mapQuery: '中島公園駅' },
  가쿠엔마에: { ja: '学園前', en: 'Gakuen-mae', codes: ['H10'], mapQuery: '学園前駅 札幌' },
  신치토세공항: { ja: '新千歳空港', en: 'New Chitose Airport', codes: ['JR'], tip: '국내선 터미널 지하 1층에 JR 타는 곳이 있어요.', mapQuery: '新千歳空港駅' },
  오타루: { ja: '小樽', en: 'Otaru', codes: ['JR'], mapQuery: '小樽駅' },
  미나미오타루: { ja: '南小樽', en: 'Minami-Otaru', codes: ['JR'], mapQuery: '南小樽駅' },
  로프웨이입구: { ja: 'ロープウェイ入口', en: 'Ropeway-iriguchi', codes: ['電'], tip: '노면전차 정류장이에요. 내려서 무료 셔틀버스를 타요.', mapQuery: 'ロープウェイ入口停留場' },
};
const ALIAS: Record<string, string> = {
  'ロープウェイ入口': '로프웨이입구', '札幌': '삿포로', 'すすきの': '스스키노', '豊水すすきの': '호스이스스키노', '大通': '오도리', '新千歳空港': '신치토세공항', '小樽': '오타루',
};

/** "삿포로역", "삿포로 역", "JR 삿포로" → "삿포로" */
export const stopKey = (s: string) => s.replace(/\s|역$|駅$|^JR|정류장$|\(.*\)/g, '').replace(/역$/, '');

export function stationOf(stop: string): StationInfo | undefined {
  const k = stopKey(stop);
  return STATIONS[k] ?? STATIONS[ALIAS[k] ?? ''];
}

/** 지도 검색어: 아는 역이면 일본어 역 이름, 모르면 이름 + 도시 */
export const stopQuery = (stop: string, city: string) => stationOf(stop)?.mapQuery ?? `${stop} ${city}`;

export const sameStop = (a?: string, b?: string) => !!a && !!b && stopKey(a) === stopKey(b);

/** 앞 구간에서 내린 역에서 다른 노선으로 갈아타는지 */
export function transferInfo(prev: TransitLeg | undefined, leg: TransitLeg): { at: string; from: string; to: string; tip?: string } | undefined {
  if (!prev || !sameStop(prev.toStop, leg.fromStop)) return undefined;
  const a = lineOf(prev), b = lineOf(leg);
  const from = a?.name ?? prev.line ?? prev.mode;
  const to = b?.name ?? leg.line ?? leg.mode;
  if (from === to && prev.mode === leg.mode) return undefined;
  const at = stopKey(leg.fromStop);
  const jr = (x?: LineInfo) => x?.code === 'JR';
  const sub = (x?: LineInfo) => !!x && ['N', 'T', 'H'].includes(x.code);
  let tip: string | undefined;
  if (at === '삿포로' && ((jr(a) && sub(b)) || (sub(a) && jr(b))))
    tip = jr(a)
      ? 'JR 개찰구를 나와서 지하로 내려가 "地下鉄 / Subway" 표지판을 따라가요. 걸어서 5~10분.'
      : '지하철 개찰구를 나와서 "JR" 표지판을 따라 올라가요. 걸어서 5~10분, JR 표는 따로 사요.';
  if (leg.mode === '도보') return undefined;
  return { at, from, to, tip };
}
