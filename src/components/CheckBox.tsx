import { useEffect, useRef } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import { c, J } from '../theme';
import { PressableScale } from './PressableScale';

/** 체크하면 상자가 꾹 눌렸다가 통 튀고, ✓가 통 들어온다 */
export function CheckBox({ on, disabled, onPress }: { on: boolean; disabled?: boolean; onPress: () => void }) {
  const p = useSharedValue(on ? 1 : 0);
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    p.value = withTiming(on ? 1 : 0, { duration: 180 });
    if (first.current) { first.current = false; return; }
    s.value = on
      ? withSequence(withTiming(0.78, { duration: 90 }), withSpring(1.12, { damping: 6, stiffness: 380 }), withSpring(1, { damping: 10, stiffness: 240 }))
      : withSequence(withTiming(0.9, { duration: 80 }), withSpring(1, { damping: 12, stiffness: 300 }));
  }, [on]);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], ['#FFFFFF', c.mint]),
    borderColor: interpolateColor(p.value, [0, 1], [c.line, c.green]),
    transform: [{ scale: s.value }],
  }));
  return (
    <PressableScale onPress={onPress} disabled={disabled} hitSlop={8} style={{ opacity: disabled ? 0.5 : 1 }}>
      <Animated.View style={[{ width: 30, height: 30, borderRadius: 10, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' }, box]}>
        {on && (
          <Animated.Text entering={first.current ? undefined : ZoomIn.springify().damping(9).stiffness(300)}
            style={{ fontFamily: J, fontSize: 16, color: c.green }}>✓</Animated.Text>
        )}
      </Animated.View>
    </PressableScale>
  );
}
