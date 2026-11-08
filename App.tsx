import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';
import { Jua_400Regular, useFonts } from '@expo-google-fonts/jua';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Avatar } from './src/components/Avatar';
import { PressableScale } from './src/components/PressableScale';
import { Sheet } from './src/components/Sheet';
import { TabBar, TabDef } from './src/components/TabBar';
import { PlanScreen } from './src/screens/PlanScreen';
import { PoolScreen } from './src/screens/PoolScreen';
import { VoteScreen } from './src/screens/VoteScreen';
import { TripProvider, useTrip } from './src/store';
import { c, J, t } from './src/theme';
import { UIContext } from './src/ui';

function Shell() {
  const { state, dispatch } = useTrip();
  const [tab, setTab] = useState('pool');
  const [membersOpen, setMembersOpen] = useState(false);
  const pendingVotes = state.trip.votes.filter((v) => !v.closed && !v.ballots[state.meId]).length;

  const tabs: TabDef[] = [
    { key: 'pool', label: '모아보기', emoji: '📌' },
    { key: 'vote', label: '투표', emoji: '✅', badge: pendingVotes },
    { key: 'plan', label: '일정', emoji: '📅' },
  ];

  return (
    <UIContext.Provider value={{ openMembers: () => setMembersOpen(true) }}>
      <View style={{ flex: 1, backgroundColor: c.bgTop }}>
        <Animated.View key={tab} entering={FadeIn.duration(280)} style={{ flex: 1 }}>
          {tab === 'pool' && <PoolScreen />}
          {tab === 'vote' && <VoteScreen />}
          {tab === 'plan' && <PlanScreen />}
        </Animated.View>
        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        <Sheet visible={membersOpen} title="누구로 볼까요? 👀" onClose={() => setMembersOpen(false)}>
          <Text style={t.note}>친구 입장에서 투표해보려면 바꿔보세요. 실제 앱에서는 각자 자기 휴대폰으로 들어와요.</Text>
          <View style={{ backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' }}>
            {state.trip.members.map((m, i) => (
              <PressableScale key={m.id} scaleTo={0.98}
                onPress={() => { dispatch({ type: 'setMe', memberId: m.id }); setMembersOpen(false); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1.5 : 0, borderColor: c.line }}>
                <Avatar member={m} size={40} />
                <Text style={[t.h, { flex: 1 }]}>{m.name}</Text>
                {m.id === state.meId && <Text style={{ fontFamily: J, fontSize: 13, color: '#fff', backgroundColor: c.ink, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' }}>나</Text>}
              </PressableScale>
            ))}
          </View>
        </Sheet>
        <StatusBar style="dark" />
      </View>
    </UIContext.Provider>
  );
}

export default function App() {
  const [loaded] = useFonts({ Jua_400Regular, GowunDodum_400Regular });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bgTop }} />;
  return (
    <SafeAreaProvider>
      <TripProvider>
        <Shell />
      </TripProvider>
    </SafeAreaProvider>
  );
}
