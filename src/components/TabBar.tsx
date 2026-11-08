import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c } from '../theme';
import { select } from './haptics';

export interface TabDef { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap; badge?: number }

function TabItem({ tab, active, onPress }: { tab: TabDef; active: boolean; onPress: () => void }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (active) s.value = withSequence(withSpring(0.82, { damping: 20, stiffness: 600 }), withSpring(1, { damping: 8, stiffness: 260 }));
  }, [active]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const color = active ? c.blue : '#8E8E93';
  return (
    <Pressable onPress={() => { select(); onPress(); }} style={{ flex: 1, alignItems: 'center', paddingTop: 8, gap: 2 }}>
      <Animated.View style={st}>
        <Ionicons name={active ? tab.iconOn : tab.icon} size={25} color={color} />
        {!!tab.badge && (
          <Animated.View entering={ZoomIn.springify()} style={{ position: 'absolute', top: -4, right: -10, backgroundColor: c.red, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{tab.badge}</Text>
          </Animated.View>
        )}
      </Animated.View>
      <Text style={{ fontSize: 10.5, fontWeight: '600', color }}>{tab.label}</Text>
    </Pressable>
  );
}

/** 반투명 블러 탭 바 */
export function TabBar({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (k: string) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 0.5, borderColor: c.sep, overflow: 'hidden' }}>
      <BlurView intensity={90} tint="light" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(249,249,249,0.75)' } as object} />
      <View style={{ flexDirection: 'row', paddingBottom: Math.max(insets.bottom, 10) }}>
        {tabs.map((t) => <TabItem key={t.key} tab={t} active={t.key === active} onPress={() => onChange(t.key)} />)}
      </View>
    </View>
  );
}
