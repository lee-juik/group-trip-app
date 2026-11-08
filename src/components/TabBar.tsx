import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { LinearTransition, useAnimatedStyle, useSharedValue, withSequence, withSpring, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, J } from '../theme';
import { select } from './haptics';

export interface TabDef { key: string; label: string; emoji: string; badge?: number }

function TabItem({ tab, active, onPress }: { tab: TabDef; active: boolean; onPress: () => void }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (active) s.value = withSequence(withSpring(0.85, { damping: 20, stiffness: 600 }), withSpring(1, { damping: 7, stiffness: 240 }));
  }, [active]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable onPress={() => { select(); onPress(); }} style={{ flex: active ? 1.6 : 1, alignItems: 'center' }}>
      <Animated.View layout={LinearTransition.springify().damping(18)}
        style={[{ flexDirection: active ? 'row' : 'column', alignItems: 'center', gap: active ? 6 : 1, paddingVertical: active ? 10 : 4, paddingHorizontal: active ? 18 : 0, borderRadius: 24, backgroundColor: active ? c.ink : 'transparent' }, st]}>
        <Text style={{ fontSize: active ? 16 : 19 }}>{tab.emoji}</Text>
        <Text style={{ fontFamily: J, fontSize: active ? 15 : 12, color: active ? '#fff' : c.faint }}>{tab.label}</Text>
        {!!tab.badge && !active && (
          <Animated.View entering={ZoomIn.springify()} style={{ position: 'absolute', top: -2, right: -8, backgroundColor: c.pink, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' }}>
            <Text style={{ color: '#fff', fontFamily: J, fontSize: 10 }}>{tab.badge}</Text>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** 바닥에 떠 있는 둥근 탭 바 */
export function TabBar({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (k: string) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 18, right: 18, bottom: Math.max(insets.bottom, 14) + 4, height: 66, borderRadius: 33, backgroundColor: 'rgba(255,255,255,0.94)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, boxShadow: '0 10px 24px rgba(120,100,180,0.18)' } as object}>
      {tabs.map((tb) => <TabItem key={tb.key} tab={tb} active={tb.key === active} onPress={() => onChange(tb.key)} />)}
    </View>
  );
}
