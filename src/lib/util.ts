import { Alert, Platform } from 'react-native';

/** 서버가 받아주는 uuid를 앱에서 먼저 만든다. 화면과 서버가 같은 id를 쓰게 되어 "방금 넣은 항목" 오류가 없어진다 */
export function uuid(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  const b = new Uint8Array(16);
  if (g.crypto?.getRandomValues) g.crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** "9:30", "9시30분", "930", "12시" → "09:30" 처럼 맞춘다. 못 알아보면 null */
export function normTime(s: string): string | null {
  const x = s.trim().replace(/\s/g, '');
  let h: number, m: number;
  let r: RegExpMatchArray | null;
  if ((r = x.match(/^(\d{1,2})[:.시](\d{1,2})분?$/))) { h = Number(r[1]); m = Number(r[2]); }
  else if ((r = x.match(/^(\d{1,2})시$/))) { h = Number(r[1]); m = 0; }
  else if ((r = x.match(/^(\d{1,2})(\d{2})$/))) { h = Number(r[1]); m = Number(r[2]); }
  else return null;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 서버/네트워크 오류를 친구들이 알아볼 수 있는 말로 */
export function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|Load failed|Network|network|fetch|timed? ?out|ECONN|abort/i.test(msg)) return '인터넷 연결이 약해요. 잠시 후 다시 해 주세요.';
  if (/invalid input syntax for type uuid/i.test(msg)) return '방금 넣은 항목이에요. 잠시 후 다시 해 주세요.';
  if (/duplicate key/i.test(msg)) return '이미 들어가 있어요.';
  if (/vote closed/i.test(msg)) return '이미 마감된 투표예요.';
  if (/not a member/i.test(msg)) return '이 여행방 멤버가 아니에요. 초대 코드로 다시 들어와 주세요.';
  if (/not allowed|row-level security|permission denied/i.test(msg)) return '이 항목은 바꿀 수 없어요.';
  if (/not host/i.test(msg)) return '방장만 할 수 있어요.';
  if (/JWT|session|refresh_token|Auth/i.test(msg)) return '로그인 정보를 확인하지 못했어요. 인터넷을 확인한 뒤 다시 열어 주세요.';
  return msg;
}

export const showError = (title: string, e: unknown) => {
  const msg = friendly(e);
  if (Platform.OS === 'web') window.alert(`${title}\n${msg}`);
  else Alert.alert(title, msg);
};

/** 확인창. 웹은 브라우저 confirm, 앱은 Alert */
export function confirmAsync(title: string, msg?: string, okLabel = '확인', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(msg ? `${title}\n${msg}` : title));
  return new Promise((res) => {
    Alert.alert(title, msg, [
      { text: '취소', style: 'cancel', onPress: () => res(false) },
      { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: () => res(true) },
    ], { cancelable: true, onDismiss: () => res(false) });
  });
}

/** 구글맵 링크에서 좌표를 뽑는다 (예: .../@43.05,141.35,17z, ?q=43.05,141.35, !3d43.05!4d141.35) */
export function parseLatLng(link?: string): { lat: number; lng: number } | undefined {
  if (!link) return undefined;
  const pats = [/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, /[?&](?:q|ll|query|center)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/];
  for (const re of pats) {
    const m = link.match(re);
    if (m) { const lat = Number(m[1]), lng = Number(m[2]); if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }; }
  }
  return undefined;
}

/** 장소를 구글맵에서 열기: 좌표가 있으면 핀으로, 없으면 이름으로 검색 */
export function mapsUrl(p: { name: string; lat?: number; lng?: number; area?: string }, city: string) {
  if (p.lat != null && p.lng != null) return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.area ?? ''} ${city}`.trim())}`;
}

/** 오늘이 여행 며칠째인지. 여행 전이면 -1, 끝났으면 days.length */
export function todayIndex(days: { date: string }[]): number {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (!days.length || today < days[0].date) return -1;
  if (today > days[days.length - 1].date) return days.length;
  const i = days.findIndex((d) => d.date === today);
  return i >= 0 ? i : -1;
}

export const hhmm = (ts: number) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
