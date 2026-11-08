import { Text, View } from 'react-native';
import { avatarColor } from '../theme';
import { Member } from '../types';

export function Avatar({ member, size = 28, ring }: { member: Member; size?: number; ring?: boolean }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(member.id),
        alignItems: 'center', justifyContent: 'center', borderWidth: ring ? 2 : 0, borderColor: '#fff',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.42 }}>{member.name.slice(0, 1)}</Text>
    </View>
  );
}

export function AvatarStack({ members, size = 24, max = 4 }: { members: Member[]; size?: number; max?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {members.slice(0, max).map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar member={m} size={size} ring />
        </View>
      ))}
    </View>
  );
}
