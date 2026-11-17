import { useState } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { c, G, J } from '../theme';

export function Group({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={{ fontFamily: J, fontSize: 13, color: c.sub, marginLeft: 14 }}>{label}</Text>}
      <View style={{ backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

/** 입력칸: 누르면 밑줄이 분홍색으로 쭉 그어지고 이름표가 살짝 통 튄다 */
export function Field({ label, last, onFocus, onBlur, ...props }: TextInputProps & { label?: string; last?: boolean }) {
  const [focused, setFocused] = useState(false);
  const line = useSharedValue(0);
  const lab = useSharedValue(1);
  const lineSt = useAnimatedStyle(() => ({ opacity: line.value === 0 ? 0 : 1, transform: [{ scaleX: line.value }] }));
  const labSt = useAnimatedStyle(() => ({ transform: [{ scale: lab.value }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 18, minHeight: 50 }}>
      {label && <Animated.Text style={[{ fontFamily: J, fontSize: 15, color: focused ? c.pink : c.ink, width: 78, transformOrigin: 'left center' } as object, labSt]}>{label}</Animated.Text>}
      <View style={{ flex: 1, borderBottomWidth: last ? 0 : 1.5, borderColor: c.line, alignSelf: 'stretch', justifyContent: 'center', paddingRight: 18 }}>
        <TextInput placeholderTextColor={c.faint} {...props}
          onFocus={(e) => {
            setFocused(true);
            line.value = withSpring(1, { damping: 16, stiffness: 180 });
            lab.value = withSpring(1.08, { damping: 8, stiffness: 300 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            line.value = withTiming(0, { duration: 180 });
            lab.value = withSpring(1, { damping: 12, stiffness: 260 });
            onBlur?.(e);
          }}
          style={[{ fontFamily: G, fontSize: 16, color: c.ink, paddingVertical: 13, outlineStyle: 'none' } as object, props.style]} />
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: last ? 4 : -1.5, height: 2.5, borderRadius: 2, backgroundColor: c.pink, transformOrigin: 'left center' } as object, lineSt]} />
      </View>
    </View>
  );
}
