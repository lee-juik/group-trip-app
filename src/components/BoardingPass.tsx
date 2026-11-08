import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { G, J } from '../theme';
import { Flight } from '../types';

/** 하늘색 탑승권 카드 */
export function BoardingPass({ flight, label }: { flight: Flight; label: string }) {
  const blue = '#5A8DB5';
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={{ borderRadius: 28, backgroundColor: '#CDEBFF', padding: 18, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.35)', right: -30, top: -40 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontFamily: J, fontSize: 13, color: blue }}>✈️ {label} {flight.flightNo}</Text>
          <Text style={{ fontFamily: J, fontSize: 30, color: '#3A3550' }}>{flight.depart} → {flight.arrive}</Text>
          <Text style={{ fontFamily: G, fontSize: 13, color: blue }}>{flight.from} → {flight.to}</Text>
        </View>
        <Text style={{ fontSize: 40 }}>{label.includes('오는') ? '🛬' : '🛫'}</Text>
      </View>
    </Animated.View>
  );
}
