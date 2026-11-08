import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { c } from '../theme';
import { PressableScale } from './PressableScale';

export function HeartButton({ on, count, onPress }: { on: boolean; count: number; onPress: () => void }) {
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (on) s.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 500 }), withSpring(1, { damping: 8, stiffness: 200 }));
  }, [on]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <PressableScale onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: on ? 'rgba(255,45,85,0.12)' : c.fill }}>
      <Animated.View style={st}>
        <Ionicons name={on ? 'heart' : 'heart-outline'} size={17} color={on ? c.pink : c.label2} />
      </Animated.View>
      <Text style={{ fontSize: 14, fontWeight: '600', color: on ? c.pink : c.label2 }}>{count}</Text>
    </PressableScale>
  );
}
