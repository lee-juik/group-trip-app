import { Ionicons } from '@expo/vector-icons';
import { StyleProp, Text, ViewStyle } from 'react-native';
import { c } from '../theme';
import { PressableScale } from './PressableScale';

type Kind = 'filled' | 'tinted' | 'plain';

export function Button({ title, icon, onPress, disabled, kind = 'filled', color = c.blue, style }: {
  title: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean; kind?: Kind; color?: string; style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === 'filled' ? color : kind === 'tinted' ? `${color}1F` : 'transparent';
  const fg = kind === 'filled' ? '#fff' : color;
  return (
    <PressableScale
      disabled={disabled}
      onPress={onPress}
      style={[{ backgroundColor: bg, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.35 : 1 }, style]}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text style={{ color: fg, fontSize: 17, fontWeight: '600' }}>{title}</Text>
    </PressableScale>
  );
}
