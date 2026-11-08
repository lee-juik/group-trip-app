import { useTrip } from '../store';
import { useUI } from '../ui';
import { Avatar } from './Avatar';
import { PressableScale } from './PressableScale';

export function MeButton() {
  const { state } = useTrip();
  const { openMembers } = useUI();
  const me = state.trip.members.find((m) => m.id === state.meId)!;
  return (
    <PressableScale onPress={openMembers} hitSlop={8}>
      <Avatar member={me} size={32} />
    </PressableScale>
  );
}
