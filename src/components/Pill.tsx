import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { c } from '../theme';
import { select } from './haptics';
import { PressableScale } from './PressableScale';

export function Pill({ label, on, icon, color = c.blue, onPress }: { label: string; on: boolean; icon?: string; color?: string; onPress: () => void }) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => { p.value = withTiming(on ? 1 : 0, { duration: 220 }); }, [on]);
  const bg = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], ['#FFFFFF', color]) }));
  return (
    <PressableScale haptic={false} onPress={() => { select(); onPress(); }}>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 }, bg]}>
        {icon && <Ionicons name={icon as any} size={14} color={on ? '#fff' : color} />}
        <Text style={{ fontSize: 15, fontWeight: '600', color: on ? '#fff' : c.label }}>{label}</Text>
      </Animated.View>
    </PressableScale>
  );
}
