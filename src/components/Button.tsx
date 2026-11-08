import { StyleProp, Text, ViewStyle } from 'react-native';
import { c, J } from '../theme';
import { PressableScale } from './PressableScale';

type Kind = 'filled' | 'soft' | 'plain';

/** 말랑한 알약 모양 버튼 */
export function Button({ title, emoji, onPress, disabled, kind = 'filled', bg, fg, style }: {
  title: string; emoji?: string; onPress: () => void; disabled?: boolean; kind?: Kind; bg?: string; fg?: string; style?: StyleProp<ViewStyle>;
}) {
  const background = bg ?? (kind === 'filled' ? c.ink : kind === 'soft' ? '#FFFFFF' : 'transparent');
  const color = fg ?? (kind === 'filled' ? '#FFFFFF' : c.ink);
  return (
    <PressableScale
      disabled={disabled}
      onPress={onPress}
      style={[{ backgroundColor: background, borderRadius: 24, paddingVertical: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.35 : 1 },
        kind === 'soft' && { borderWidth: 2, borderColor: c.line }, style]}
    >
      {emoji && <Text style={{ fontSize: 17 }}>{emoji}</Text>}
      <Text style={{ color, fontFamily: J, fontSize: 17 }}>{title}</Text>
    </PressableScale>
  );
}
