import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Pressable, StatusBar as RNStatusBar, Text, View } from 'react-native';
import { Chip } from './src/components/Chip';
import { PlanScreen } from './src/screens/PlanScreen';
import { PoolScreen } from './src/screens/PoolScreen';
import { VoteScreen } from './src/screens/VoteScreen';
import { TripProvider, useTrip } from './src/store';
import { colors, ui } from './src/theme';

const TABS = [
  { key: 'pool', label: '수집함', icon: '📌' },
  { key: 'vote', label: '투표', icon: '🗳️' },
  { key: 'plan', label: '일정', icon: '🗓️' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function Shell() {
  const { state, dispatch } = useTrip();
  const [tab, setTab] = useState<TabKey>('pool');
  const openVotes = state.trip.votes.filter((v) => !v.closed && !v.ballots[state.meId]).length;
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : Platform.OS === 'ios' ? 50 : 12;

  return (
    <View style={[ui.screen, { paddingTop: topInset }]}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.line }}>
        <Text style={ui.h1}>{state.trip.title}</Text>
        <View style={[ui.row, { flexWrap: 'wrap' }]}>
          <Text style={ui.sub}>나는</Text>
          {state.trip.members.map((m) => (
            <Chip key={m.id} label={m.name} on={m.id === state.meId} onPress={() => dispatch({ type: 'setMe', memberId: m.id })} />
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'pool' && <PoolScreen />}
        {tab === 'vote' && <VoteScreen />}
        {tab === 'plan' && <PlanScreen />}
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingBottom: Platform.OS === 'ios' ? 24 : 8 }}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, alignItems: 'center', paddingTop: 8, gap: 2 }}>
            <Text style={{ fontSize: 20 }}>{t.icon}</Text>
            <Text style={{ fontSize: 12, fontWeight: tab === t.key ? '700' : '400', color: tab === t.key ? colors.primary : colors.sub }}>
              {t.label}
              {t.key === 'vote' && openVotes ? ` (${openVotes})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  return (
    <TripProvider>
      <Shell />
    </TripProvider>
  );
}
