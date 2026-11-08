import { useEffect, useRef } from 'react';
import { Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { c, J } from '../theme';
import { PressableScale } from './PressableScale';

export function HeartButton({ on, count, onPress }: { on: boolean; count: number; onPress: () => void }) {
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (on) s.value = withSequence(withSpring(1.45, { damping: 6, stiffness: 500 }), withSpring(1, { damping: 7, stiffness: 200 }));
  }, [on]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <PressableScale onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: on ? '#fff' : 'rgba(255,255,255,0.6)' }}>
      <Animated.Text style={[{ fontSize: 13, color: on ? c.pink : c.faint }, st]}>{on ? '♥' : '♡'}</Animated.Text>
      <Text style={{ fontFamily: J, fontSize: 14, color: on ? c.pink : c.faint }}>{count}</Text>
    </PressableScale>
  );
}
