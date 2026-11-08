import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, font } from '../theme';

/** 아래에서 스프링으로 올라오는 iOS 시트 */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(200)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.32)' } as object}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(180)}
        exiting={SlideOutDown.duration(220)}
        style={{ backgroundColor: c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', paddingBottom: insets.bottom + 12 }}
      >
        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: c.label3 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={font.title3}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.label2 }}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </Animated.View>
    </View>
    </Modal>
  );
}
