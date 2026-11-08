import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { tap } from './haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** 누르면 살짝 작아졌다가 스프링으로 돌아오는 iOS 느낌의 버튼 */
export function PressableScale({ style, scaleTo = 0.96, haptic = true, onPress, children, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={() => (s.value = withSpring(scaleTo, { damping: 15, stiffness: 400 }))}
      onPressOut={() => (s.value = withSpring(1, { damping: 12, stiffness: 300 }))}
      onPress={(e) => {
        if (haptic) tap();
        onPress?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}
