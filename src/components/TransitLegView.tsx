import { Linking, Text, View } from 'react-native';
import { c, G, J, transitStyle } from '../theme';
import { TransitLeg } from '../types';
import { PressableScale } from './PressableScale';

/** 구글 지도 대중교통 길찾기를 연다. 실제 시간표는 여기서 확인할 수 있다. */
export function openTransitDirections(from: string, to: string, city: string) {
  const q = (s: string) => encodeURIComponent(`${s} ${city}`);
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${q(from)}&destination=${q(to)}&travelmode=transit`);
}

export const minutes = (a: string, b: string) => {
  const m = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const d = m(b) - m(a);
  return Number.isFinite(d) && d > 0 ? `${d}분` : '';
};

/** 일정 사이의 이동: 동글동글한 탈것 칩 */
export function TransitLegView({ leg, city, onEdit }: { leg: TransitLeg; city: string; onEdit: () => void }) {
  const ts = transitStyle[leg.mode];
  const dur = minutes(leg.depart, leg.arrive);
  return (
    <PressableScale scaleTo={0.97} onPress={onEdit} style={{ alignSelf: 'flex-start', backgroundColor: ts.bg, borderRadius: 18, paddingVertical: 9, paddingHorizontal: 14, gap: 3 }}>
      <Text style={{ fontFamily: J, fontSize: 14, color: ts.fg }}>
        {ts.emoji} {leg.line || leg.mode} · {leg.depart}→{leg.arrive}{dur ? ` · ${dur}` : ''}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Text style={{ fontFamily: G, fontSize: 12, color: ts.fg, opacity: 0.8 }}>{leg.fromStop} → {leg.toStop}</Text>
        <Text style={{ fontFamily: J, fontSize: 12, color: c.ink, textDecorationLine: 'underline' }} onPress={() => openTransitDirections(leg.fromStop, leg.toStop, city)}>
          실시간 시간표
        </Text>
      </View>
    </PressableScale>
  );
}
