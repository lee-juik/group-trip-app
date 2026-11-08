import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, font } from '../theme';

/**
 * iOS 큰 제목 화면. 스크롤하면 큰 제목이 사라지고
 * 위쪽 반투명 내비게이션 바에 작은 제목이 나타난다. 당겨 내리면 제목이 살짝 커진다.
 */
export function LargeHeaderScreen({ title, right, children, bottomInset = 100 }: { title: string; right?: ReactNode; children: ReactNode; bottomInset?: number }) {
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, 12);
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });

  const bar = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [30, 60], [0, 1], Extrapolation.CLAMP) }));
  const small = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [40, 64], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(y.value, [40, 64], [6, 0], Extrapolation.CLAMP) }],
  }));
  const large = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 40], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(y.value, [-120, 0], [1.12, 1], Extrapolation.CLAMP) },
      { translateX: interpolate(y.value, [-120, 0], [14, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: top + 44, paddingBottom: bottomInset, paddingHorizontal: 16, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[{ transformOrigin: 'left' } as object, large]}>
          <Text style={font.largeTitle}>{title}</Text>
        </Animated.View>
        {children}
      </Animated.ScrollView>

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top + 44 }} pointerEvents="box-none">
        <Animated.View style={[{ position: 'absolute', inset: 0, borderBottomWidth: 0.5, borderColor: c.sep } as object, bar]}>
          <BlurView intensity={80} tint="light" style={{ flex: 1, backgroundColor: 'rgba(249,249,249,0.7)' }} />
        </Animated.View>
        <View style={{ marginTop: top, height: 44, alignItems: 'center', justifyContent: 'center' }} pointerEvents="box-none">
          <Animated.Text style={[font.headline, small]}>{title}</Animated.Text>
          <View style={{ position: 'absolute', right: 16 }}>{right}</View>
        </View>
      </View>
    </View>
  );
}
