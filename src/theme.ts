import { Platform } from 'react-native';
import { Category, TransitMode } from './types';

// iOS 시스템 색상에 맞춘 팔레트
export const c = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  label: '#000000',
  label2: 'rgba(60,60,67,0.6)',
  label3: 'rgba(60,60,67,0.3)',
  sep: 'rgba(60,60,67,0.12)',
  fill: 'rgba(118,118,128,0.12)',
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.12)',
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
  pink: '#FF2D55',
  purple: '#AF52DE',
  teal: '#30B0C7',
  indigo: '#5856D6',
};

export const shadow = Platform.select({
  web: { boxShadow: '0 6px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' } as object,
  default: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
});

export const font = {
  largeTitle: { fontSize: 34, fontWeight: '800' as const, letterSpacing: 0.3, color: c.label },
  title2: { fontSize: 22, fontWeight: '700' as const, color: c.label },
  title3: { fontSize: 20, fontWeight: '600' as const, color: c.label },
  headline: { fontSize: 17, fontWeight: '600' as const, color: c.label },
  body: { fontSize: 17, color: c.label },
  callout: { fontSize: 16, color: c.label },
  subhead: { fontSize: 15, color: c.label },
  footnote: { fontSize: 13, color: c.label2 },
  caption: { fontSize: 12, color: c.label2 },
};

export const categoryStyle: Record<Category, { icon: string; color: string }> = {
  맛집: { icon: 'restaurant', color: c.orange },
  카페: { icon: 'cafe', color: '#A2845E' },
  관광지: { icon: 'camera', color: c.teal },
  숙소: { icon: 'bed', color: c.indigo },
  교통: { icon: 'car', color: c.green },
  쇼핑: { icon: 'bag-handle', color: c.pink },
};

export const transitStyle: Record<TransitMode, { icon: string; color: string }> = {
  JR: { icon: 'train', color: c.green },
  지하철: { icon: 'subway', color: c.blue },
  버스: { icon: 'bus', color: c.orange },
  도보: { icon: 'walk', color: c.label2 },
  택시: { icon: 'car', color: '#F5B400' },
  렌트카: { icon: 'car-sport', color: c.purple },
};

const avatarColors = [c.blue, c.pink, c.orange, c.green, c.purple, c.teal];
export const avatarColor = (id: string) => avatarColors[[...id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % avatarColors.length];
