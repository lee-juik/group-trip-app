import { Linking, Pressable, Text, View } from 'react-native';
import { colors, ui } from '../theme';
import { TransitLeg } from '../types';

const icon: Record<TransitLeg['mode'], string> = { 지하철: '🚇', 버스: '🚌', JR: '🚆', 도보: '🚶', 택시: '🚕', 렌트카: '🚗' };

/** 구글 지도 대중교통 길찾기를 연다. 실제 시간표는 여기서 확인할 수 있다. */
export function openTransitDirections(from: string, to: string, city: string) {
  const q = (s: string) => encodeURIComponent(`${s} ${city}`);
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${q(from)}&destination=${q(to)}&travelmode=transit`);
}

export function TransitLegView({ leg, city, onEdit }: { leg: TransitLeg; city: string; onEdit?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', marginLeft: 22 }}>
      <View style={{ width: 2, backgroundColor: colors.line, marginRight: 14 }} />
      <Pressable onPress={onEdit} style={{ flex: 1, paddingVertical: 8, gap: 2 }}>
        <Text style={[ui.body, { fontWeight: '600' }]}>
          {icon[leg.mode]} {leg.depart} 출발 → {leg.arrive} 도착 · {leg.mode}
          {leg.line ? ` ${leg.line}` : ''}
        </Text>
        <Text style={ui.sub}>
          {leg.fromStop} → {leg.toStop}
          {leg.note ? ` · ${leg.note}` : ''}
        </Text>
        <Text
          style={[ui.sub, { color: colors.primary }]}
          onPress={() => openTransitDirections(leg.fromStop, leg.toStop, city)}
        >
          실제 시간표 보기 (구글 지도) ›
        </Text>
      </Pressable>
    </View>
  );
}
