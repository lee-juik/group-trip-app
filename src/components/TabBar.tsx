import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, J } from '../theme';
import { select } from './haptics';

export interface TabDef { key: string; label: string; emoji: string; badge?: number }

const PAD = 8; // 탭 바 안쪽 여백
const INSET = 3; // 알약이 칸보다 살짝 작게

function TabItem({ tab, active, onPress }: { tab: TabDef; active: boolean; onPress: () => void }) {
  // 고른 탭의 이모지가 통 튀어오른다
  const y = useSharedValue(0);
  const s = useSharedValue(1);
  useEffect(() => {
    if (!active) return;
    y.value = withSequence(withTiming(-5, { duration: 120 }), withSpring(0, { damping: 6, stiffness: 260 }));
    s.value = withSequence(withTiming(1.22, { duration: 120 }), withSpring(1, { damping: 7, stiffness: 240 }));
  }, [active]);
  const emoji = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: s.value }] }));
  return (
    <Pressable onPress={() => { select(); onPress(); }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Animated.Text style={[{ fontSize: 19 }, emoji]}>{tab.emoji}</Animated.Text>
      <Text numberOfLines={1} style={{ fontFamily: J, fontSize: 12, marginTop: 1, color: active ? '#fff' : c.sub }}>{tab.label}</Text>
      {!!tab.badge && !active && (
        <Animated.View entering={ZoomIn.springify()} style={{ position: 'absolute', top: 6, right: '14%', backgroundColor: c.pink, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' }}>
          <Text style={{ color: '#fff', fontFamily: J, fontSize: 10 }}>{tab.badge}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

/** 바닥에 떠 있는 둥근 탭 바. 진한 알약 하나가 고른 탭으로 말랑하게 미끄러진다 */
export function TabBar({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (k: string) => void }) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const idx = Math.max(0, tabs.findIndex((tb) => tb.key === active));
  const seg = w > 0 ? (w - PAD * 2) / tabs.length : 0;
  const x = useSharedValue(0);
  const stretch = useSharedValue(1);
  const ready = useSharedValue(0);
  useEffect(() => {
    if (!seg) return;
    const to = PAD + idx * seg + INSET;
    if (!ready.value) { x.value = to; ready.value = 1; return; }
    x.value = withSpring(to, { damping: 17, stiffness: 190, mass: 0.9 });
    // 움직이는 동안 옆으로 쭉 늘어났다가 젤리처럼 돌아온다
    stretch.value = withSequence(withTiming(1.28, { duration: 130 }), withSpring(1, { damping: 9, stiffness: 220 }));
  }, [idx, seg]);
  const pill = useAnimatedStyle(() => ({ opacity: ready.value, transform: [{ translateX: x.value }, { scaleX: stretch.value }] }));

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ position: 'absolute', left: 18, right: 18, bottom: Math.max(insets.bottom, 14) + 4, height: 66, borderRadius: 33, backgroundColor: 'rgba(255,255,255,0.94)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, boxShadow: '0 10px 24px rgba(120,100,180,0.18)' } as object}>
      {seg > 0 && (
        <Animated.View pointerEvents="none"
          style={[{ position: 'absolute', left: 0, top: 6, bottom: 6, width: seg - INSET * 2, borderRadius: 27, backgroundColor: c.ink }, pill]} />
      )}
      {tabs.map((tb) => <TabItem key={tb.key} tab={tb} active={tb.key === active} onPress={() => onChange(tb.key)} />)}
    </View>
  );
}
