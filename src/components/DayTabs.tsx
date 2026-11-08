import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { c, J } from '../theme';
import { select } from './haptics';

/** 날짜 탭: 복숭아색 선택 표시가 스프링으로 미끄러진다 */
export function DayTabs({ options, index, onChange }: { options: string[]; index: number; onChange: (i: number) => void }) {
  const [w, setW] = useState(0);
  const gap = 8;
  const seg = (w - gap * (options.length - 1)) / options.length;
  const x = useSharedValue(0);
  useEffect(() => { x.value = withSpring(index * (seg + gap), { damping: 16, stiffness: 200 }); }, [index, seg]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', gap }}>
      {options.map((_, i) => (
        <View key={i} style={{ position: 'absolute', left: i * (seg + gap), width: seg, top: 0, bottom: 0, backgroundColor: '#fff', borderRadius: 20 }} />
      ))}
      {w > 0 && <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: seg, backgroundColor: '#FFD3C2', borderRadius: 20 }, thumb]} />}
      {options.map((o, i) => (
        <Pressable key={o} onPress={() => { if (i !== index) { select(); onChange(i); } }} style={{ flex: 1, alignItems: 'center', paddingVertical: 11 }}>
          <Text style={{ fontFamily: J, fontSize: 15, color: i === index ? c.ink : c.sub }}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}
