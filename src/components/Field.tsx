import { Text, TextInput, TextInputProps, View } from 'react-native';
import { c } from '../theme';

/** iOS 설정 앱 스타일의 그룹 입력 칸 */
export function Group({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={{ fontSize: 13, color: c.label2, marginLeft: 16, textTransform: 'uppercase' }}>{label}</Text>}
      <View style={{ backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

export function Field({ label, last, ...props }: TextInputProps & { label?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 46 }}>
      {label && <Text style={{ fontSize: 16, color: c.label, width: 82 }}>{label}</Text>}
      <View style={{ flex: 1, borderBottomWidth: last ? 0 : 0.5, borderColor: c.sep, alignSelf: 'stretch', justifyContent: 'center', paddingRight: 16 }}>
        <TextInput placeholderTextColor={c.label3} {...props} style={[{ fontSize: 16, color: c.label, paddingVertical: 12 }, props.style]} />
      </View>
    </View>
  );
}
