import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { c, J, softShadow } from '../theme';
import { select } from './haptics';
import { PressableScale } from './PressableScale';

export function Pill({ label, on, emoji, onBg = c.ink, onFg = '#fff', onPress }: { label: string; on: boolean; emoji?: string; onBg?: string; onFg?: string; onPress: () => void }) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => { p.value = withTiming(on ? 1 : 0, { duration: 220 }); }, [on]);
  const bg = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], ['#FFFFFF', onBg]) }));
  return (
    <PressableScale haptic={false} onPress={() => { select(); onPress(); }}>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 15, borderRadius: 20 }, softShadow, bg]}>
        {emoji && <Text style={{ fontSize: 14 }}>{emoji}</Text>}
        <Text style={{ fontFamily: J, fontSize: 15, color: on ? onFg : '#6C6588' }}>{label}</Text>
      </Animated.View>
    </PressableScale>
  );
}
