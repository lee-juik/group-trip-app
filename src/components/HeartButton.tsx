import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { c, J } from '../theme';
import { PressableScale } from './PressableScale';

// 하트를 누르면 둘레로 튀어나가는 작은 조각들 (각도, 색, 모양)
const BITS: { a: number; color: string; heart?: boolean }[] = [
  { a: -90, color: c.pink, heart: true },
  { a: -30, color: '#FFB38A' },
  { a: 30, color: c.pink, heart: true },
  { a: 90, color: '#B9A2FF' },
  { a: 150, color: c.pink, heart: true },
  { a: 210, color: '#FFD36E' },
];

function Bit({ p, a, color, heart }: { p: SharedValue<number>; a: number; color: string; heart?: boolean }) {
  const rad = (a * Math.PI) / 180;
  const st = useAnimatedStyle(() => {
    const d = 6 + p.value * 16;
    return {
      opacity: p.value === 0 ? 0 : 1 - p.value,
      transform: [{ translateX: Math.cos(rad) * d }, { translateY: Math.sin(rad) * d }, { scale: 0.4 + (1 - p.value) * 0.7 }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 8, height: 8, marginLeft: -4, marginTop: -4, alignItems: 'center', justifyContent: 'center' }, st]}>
      {heart ? <Text style={{ fontSize: 8, color, lineHeight: 9 }}>♥</Text> : <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />}
    </Animated.View>
  );
}

/** 하트 버튼: 누르면 하트가 통 커졌다가 작은 하트·점들이 팡 터진다 */
export function HeartButton({ on, count, onPress }: { on: boolean; count: number; onPress: () => void }) {
  const s = useSharedValue(1);
  const burst = useSharedValue(0);
  const ring = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (on) {
      s.value = withSequence(withTiming(0.6, { duration: 90 }), withSpring(1.35, { damping: 5, stiffness: 420 }), withSpring(1, { damping: 8, stiffness: 220 }));
      burst.value = 0; burst.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) });
      ring.value = 0; ring.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
    } else {
      s.value = withSequence(withTiming(0.8, { duration: 90 }), withSpring(1, { damping: 10, stiffness: 300 }));
    }
  }, [on]);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const ringSt = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : (1 - ring.value) * 0.7,
    transform: [{ scale: 0.3 + ring.value * 1.3 }],
  }));
  return (
    <PressableScale onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: on ? '#fff' : 'rgba(255,255,255,0.6)' }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.pink }, ringSt]} />
        <View style={{ position: 'absolute', left: '50%', top: '50%' }}>
          {BITS.map((b, i) => <Bit key={i} p={burst} {...b} />)}
        </View>
        <Animated.Text style={[{ fontSize: 13, color: on ? c.pink : c.faint }, heart]}>{on ? '♥' : '♡'}</Animated.Text>
      </View>
      <Text style={{ fontFamily: J, fontSize: 14, color: on ? c.pink : c.faint }}>{count}</Text>
    </PressableScale>
  );
}
