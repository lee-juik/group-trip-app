import { Pressable, Text } from 'react-native';
import { ui } from '../theme';

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[ui.chip, on && ui.chipOn]}>
      <Text style={ui.chipText}>{label}</Text>
    </Pressable>
  );
}
