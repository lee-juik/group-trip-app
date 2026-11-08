import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { c, shadow } from '../theme';
import { select } from './haptics';

/** iOS 세그먼트 컨트롤: 선택 표시가 스프링으로 미끄러진다 */
export function Segmented({ options, index, onChange }: { options: { label: string; sub?: string }[]; index: number; onChange: (i: number) => void }) {
  const [w, setW] = useState(0);
  const seg = w / options.length;
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withSpring(index * seg, { damping: 18, stiffness: 220 });
  }, [index, seg]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const tall = options.some((o) => o.sub);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width - 4)} style={{ backgroundColor: c.fill, borderRadius: 12, padding: 2, flexDirection: 'row' }}>
      {w > 0 && (
        <Animated.View style={[{ position: 'absolute', top: 2, left: 2, bottom: 2, width: seg, backgroundColor: '#fff', borderRadius: 10 }, shadow, thumb]} />
      )}
      {options.map((o, i) => (
        <Pressable
          key={o.label}
          onPress={() => { if (i !== index) { select(); onChange(i); } }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: tall ? 7 : 8 }}
        >
          <Text style={{ fontSize: 14, fontWeight: i === index ? '700' : '500', color: c.label }}>{o.label}</Text>
          {o.sub && <Text style={{ fontSize: 11, color: c.label2, marginTop: 1 }}>{o.sub}</Text>}
        </Pressable>
      ))}
    </View>
  );
}
