import { Text, TextInput, TextInputProps, View } from 'react-native';
import { c, G, J } from '../theme';

export function Group({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={{ fontFamily: J, fontSize: 13, color: c.sub, marginLeft: 14 }}>{label}</Text>}
      <View style={{ backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

export function Field({ label, last, ...props }: TextInputProps & { label?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 18, minHeight: 50 }}>
      {label && <Text style={{ fontFamily: J, fontSize: 15, color: c.ink, width: 78 }}>{label}</Text>}
      <View style={{ flex: 1, borderBottomWidth: last ? 0 : 1.5, borderColor: c.line, alignSelf: 'stretch', justifyContent: 'center', paddingRight: 18 }}>
        <TextInput placeholderTextColor={c.faint} {...props} style={[{ fontFamily: G, fontSize: 16, color: c.ink, paddingVertical: 13, outlineStyle: 'none' } as object, props.style]} />
      </View>
    </View>
  );
}
