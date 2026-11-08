import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bgGradient, c, t } from '../theme';

/**
 * 파스텔 배경 + 큰 인사말 제목. 스크롤하면 큰 제목이 사라지고
 * 위쪽 반투명 바에 작은 제목이 나타난다. 당겨 내리면 제목이 살짝 커진다.
 */
export function LargeHeaderScreen({ title, greeting, compactTitle, right, children }: { title: string; greeting?: string; compactTitle?: string; right?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, 12);
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });

  const bar = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [40, 80], [0, 1], Extrapolation.CLAMP) }));
  const small = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [60, 90], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(y.value, [60, 90], [8, 0], Extrapolation.CLAMP) }],
  }));
  const large = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 60], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(y.value, [0, 60], [0, -10], Extrapolation.CLAMP) },
      { scale: interpolate(y.value, [-120, 0], [1.1, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={bgGradient} locations={[0, 0.55, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ position: 'absolute', inset: 0 } as object} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: top + 48, paddingBottom: 120, paddingHorizontal: 18, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[{ transformOrigin: 'left', gap: 2, paddingRight: 48 } as object, large]}>
          {greeting && <Text style={[t.note, { fontSize: 15 }]}>{greeting}</Text>}
          <Text style={t.hero}>{title}</Text>
        </Animated.View>
        {children}
      </Animated.ScrollView>

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top + 48 }} pointerEvents="box-none">
        <Animated.View style={[{ position: 'absolute', inset: 0 } as object, bar]}>
          <BlurView intensity={60} tint="light" style={{ flex: 1, backgroundColor: 'rgba(255,248,244,0.75)' }} />
        </Animated.View>
        <View style={{ marginTop: top, height: 48, alignItems: 'center', justifyContent: 'center' }} pointerEvents="box-none">
          <Animated.Text style={[t.h, small]}>{compactTitle ?? title}</Animated.Text>
          <View style={{ position: 'absolute', right: 18 }}>{right}</View>
        </View>
      </View>
    </View>
  );
}
