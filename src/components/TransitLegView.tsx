import { Ionicons } from '@expo/vector-icons';
import { Linking, Text, View } from 'react-native';
import { c, font, transitStyle } from '../theme';
import { TransitLeg } from '../types';
import { PressableScale } from './PressableScale';

/** 구글 지도 대중교통 길찾기를 연다. 실제 시간표는 여기서 확인할 수 있다. */
export function openTransitDirections(from: string, to: string, city: string) {
  const q = (s: string) => encodeURIComponent(`${s} ${city}`);
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${q(from)}&destination=${q(to)}&travelmode=transit`);
}

const minutes = (a: string, b: string) => {
  const m = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const d = m(b) - m(a);
  return Number.isFinite(d) && d > 0 ? `${d}분` : '';
};

export function TransitLegView({ leg, city, onEdit }: { leg: TransitLeg; city: string; onEdit: () => void }) {
  const ts = transitStyle[leg.mode];
  const dur = minutes(leg.depart, leg.arrive);
  return (
    <PressableScale scaleTo={0.98} onPress={onEdit}
      style={{ backgroundColor: `${ts.color}14`, borderRadius: 14, padding: 12, gap: 6, borderWidth: 1, borderColor: `${ts.color}33` }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ backgroundColor: ts.color, borderRadius: 8, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={ts.icon as any} size={15} color="#fff" />
        </View>
        <Text style={[font.subhead, { fontWeight: '700', flex: 1 }]} numberOfLines={1}>
          {leg.mode}{leg.line ? ` · ${leg.line}` : ''}
        </Text>
        {!!dur && <Text style={[font.footnote, { fontWeight: '600', color: ts.color }]}>{dur}</Text>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[font.callout, { fontWeight: '700', fontVariant: ['tabular-nums'] }]}>{leg.depart}</Text>
        <Text style={font.footnote} numberOfLines={1}>{leg.fromStop}</Text>
        <Ionicons name="arrow-forward" size={13} color={c.label2} />
        <Text style={[font.callout, { fontWeight: '700', fontVariant: ['tabular-nums'] }]}>{leg.arrive}</Text>
        <Text style={[font.footnote, { flex: 1 }]} numberOfLines={1}>{leg.toStop}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={font.caption}>{leg.note ?? ''}</Text>
        <Text style={[font.footnote, { color: c.blue, fontWeight: '600' }]} onPress={() => openTransitDirections(leg.fromStop, leg.toStop, city)}>
          실시간 시간표 ›
        </Text>
      </View>
    </PressableScale>
  );
}
