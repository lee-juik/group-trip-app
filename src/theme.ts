import { Platform } from 'react-native';
import { Category, TransitMode } from './types';

export const J = 'Jua_400Regular';
export const G = 'GowunDodum_400Regular';

// 파스텔 팔레트
export const c = {
  bgTop: '#FFF4EC',
  bgMid: '#F6F0FF',
  bgBottom: '#EEF8FF',
  ink: '#3A3550',
  sub: '#8E87A8',
  faint: '#B3ADC8',
  line: '#ECE6F7',
  card: '#FFFFFF',
  sheet: '#FBF8FF',
  pink: '#FF6F91',
  pinkSoft: '#FFE3EC',
  lilac: '#E8DEFF',
  lilacDeep: '#8A6FB3',
  peach: '#FFE4D6',
  mint: '#DDF5E8',
  sky: '#DCEBFF',
  butter: '#FFF1C2',
  green: '#2F8A5F',
  orange: '#C0663D',
};

export const bgGradient = [c.bgTop, c.bgMid, c.bgBottom] as const;

export const softShadow = Platform.select({
  web: { boxShadow: '0 4px 0 rgba(120,100,180,0.08), 0 10px 24px rgba(120,100,180,0.08)' } as object,
  default: { shadowColor: '#7864B4', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
});

export const t = {
  hero: { fontFamily: J, fontSize: 30, lineHeight: 38, color: c.ink },
  title: { fontFamily: J, fontSize: 22, color: c.ink },
  h: { fontFamily: J, fontSize: 18, color: c.ink },
  label: { fontFamily: J, fontSize: 15, color: c.ink },
  small: { fontFamily: J, fontSize: 13, color: c.faint },
  body: { fontFamily: G, fontSize: 15, lineHeight: 21, color: c.ink },
  note: { fontFamily: G, fontSize: 13, lineHeight: 18, color: c.sub },
};

export const categoryStyle: Record<Category, { emoji: string; bg: string }> = {
  맛집: { emoji: '🍜', bg: c.peach },
  카페: { emoji: '☕', bg: c.butter },
  관광지: { emoji: '📸', bg: c.sky },
  숙소: { emoji: '🛏', bg: c.lilac },
  교통: { emoji: '🚃', bg: c.mint },
  쇼핑: { emoji: '🛍', bg: '#FFDDEB' },
};

export const transitStyle: Record<TransitMode, { emoji: string; bg: string; fg: string }> = {
  JR: { emoji: '🚃', bg: c.mint, fg: '#2F8A5F' },
  지하철: { emoji: '🚇', bg: c.sky, fg: '#3B74B0' },
  버스: { emoji: '🚌', bg: c.peach, fg: '#C0663D' },
  도보: { emoji: '🚶', bg: '#F1EEF8', fg: '#6C6588' },
  택시: { emoji: '🚕', bg: c.butter, fg: '#A07A12' },
  렌트카: { emoji: '🚗', bg: c.lilac, fg: '#6B52B5' },
};

const avatarColors = ['#FFB38A', '#8FD9B6', '#B9A2FF', '#8CCBFF', '#FF9EB8', '#FFD36E'];
export const avatarColor = (id: string) => avatarColors[[...id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % avatarColors.length];
