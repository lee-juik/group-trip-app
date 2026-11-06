import { Pressable, Text, ViewStyle } from 'react-native';
import { colors, ui } from '../theme';

export function Button({ title, onPress, disabled, style, ghost }: { title: string; onPress: () => void; disabled?: boolean; style?: ViewStyle; ghost?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[ui.btn, ghost && { backgroundColor: colors.primarySoft }, disabled && { opacity: 0.4 }, style]}
    >
      <Text style={[ui.btnText, ghost && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}
