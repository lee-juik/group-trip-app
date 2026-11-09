import { useTrip } from '../store';
import { useUI } from '../ui';
import { Avatar } from './Avatar';
import { PressableScale } from './PressableScale';

export function MeButton() {
  const { state } = useTrip();
  const { openMembers } = useUI();
  const me = state.trip.members.find((m) => m.id === state.meId);
  // 내보내진 직후처럼 내 자리가 잠깐 없을 수 있다
  if (!me) return null;
  return (
    <PressableScale onPress={openMembers} hitSlop={8}>
      <Avatar member={me} size={38} />
    </PressableScale>
  );
}
