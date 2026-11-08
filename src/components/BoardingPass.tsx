import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { shadow } from '../theme';
import { Flight } from '../types';

/** 항공편을 탑승권 모양으로 보여준다 */
export function BoardingPass({ flight, label }: { flight: Flight; label: string }) {
  const w = 'rgba(255,255,255,0.75)';
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[{ borderRadius: 22, overflow: 'hidden' }, shadow]}>
      <LinearGradient colors={['#0A2A66', '#1856C8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: w, fontSize: 13, fontWeight: '600' }}>✈︎ {label}</Text>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 }}>{flight.flightNo}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{flight.depart}</Text>
            <Text style={{ color: w, fontSize: 15, fontWeight: '600' }}>{flight.from}</Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ flex: 1, borderTopWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed' }} />
            <Ionicons name="airplane" size={20} color="#fff" />
            <View style={{ flex: 1, borderTopWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed' }} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{flight.arrive}</Text>
            <Text style={{ color: w, fontSize: 15, fontWeight: '600' }}>{flight.to}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
