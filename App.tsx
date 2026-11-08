import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';
import { Jua_400Regular, useFonts } from '@expo-google-fonts/jua';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Avatar } from './src/components/Avatar';
import { Button } from './src/components/Button';
import { success } from './src/components/haptics';
import { PressableScale } from './src/components/PressableScale';
import { Sheet } from './src/components/Sheet';
import { TabBar, TabDef } from './src/components/TabBar';
import { useChat, useUnread } from './src/lib/chat';
import { ChatScreen } from './src/screens/ChatScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { PoolScreen } from './src/screens/PoolScreen';
import { VoteScreen } from './src/screens/VoteScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { TripProvider, useHasTrip, useSession, useTrip } from './src/store';
import { c, J, t } from './src/theme';
import { UIContext } from './src/ui';

function Shell() {
  const { state, dispatch } = useTrip();
  const [tab, setTab] = useState('pool');
  const [membersOpen, setMembersOpen] = useState(false);
  const { mode, leave } = useSession();
  const demo = mode === 'demo';
  const [copied, setCopied] = useState(false);
  const chat = useChat();
  const unread = useUnread(chat, tab === 'chat');
  const pendingVotes = state.trip.votes.filter((v) => !v.closed && !v.myChoice).length;
  const code = state.trip.inviteCode ?? '';
  const invite = `${state.trip.title} 같이 짜자! ✈️\n앱에서 초대 코드 ${code} 를 입력해줘`;
  const shareInvite = async () => {
    if (Platform.OS === 'web') { await Clipboard.setStringAsync(invite); setCopied(true); return; }
    await Share.share({ message: invite });
  };
  const copyCode = async () => { await Clipboard.setStringAsync(code); success(); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const tabs: TabDef[] = [
    { key: 'pool', label: '모아보기', emoji: '📌' },
    { key: 'vote', label: '투표', emoji: '✅', badge: pendingVotes },
    { key: 'plan', label: '일정', emoji: '📅' },
    { key: 'chat', label: '수다', emoji: '💬', badge: unread },
  ];

  return (
    <UIContext.Provider value={{ openMembers: () => setMembersOpen(true) }}>
      <View style={{ flex: 1, backgroundColor: c.bgTop }}>
        <Animated.View key={tab} entering={FadeIn.duration(280)} style={{ flex: 1 }}>
          {tab === 'pool' && <PoolScreen />}
          {tab === 'vote' && <VoteScreen />}
          {tab === 'plan' && <PlanScreen />}
          {tab === 'chat' && <ChatScreen chat={chat} />}
        </Animated.View>
        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        <Sheet visible={membersOpen} title={demo ? '누구로 볼까요? 👀' : '우리 여행방 🧳'} onClose={() => setMembersOpen(false)}>
          {demo ? (
            <Text style={t.note}>샘플 여행이에요. 친구 입장에서 투표해보려면 바꿔보세요.</Text>
          ) : (
            <View style={{ backgroundColor: c.lilac, borderRadius: 26, padding: 18, gap: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: J, fontSize: 14, color: c.lilacDeep }}>친구한테 이 코드를 보내주세요</Text>
              <PressableScale onPress={copyCode} scaleTo={0.96}>
                <Text style={{ fontFamily: J, fontSize: 40, letterSpacing: 8, color: c.ink }}>{code}</Text>
              </PressableScale>
              <Text style={[t.note, { color: c.lilacDeep }]}>{copied ? '복사했어요! 📋' : '코드를 누르면 복사돼요'}</Text>
              <Button title="초대 메시지 보내기" emoji="💌" onPress={shareInvite} style={{ alignSelf: 'stretch' }} />
            </View>
          )}
          <View style={{ backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' }}>
            {state.trip.members.map((m, i) => (
              <PressableScale key={m.id} scaleTo={0.98} disabled={!demo}
                onPress={() => { dispatch({ type: 'setMe', memberId: m.id }); setMembersOpen(false); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1.5 : 0, borderColor: c.line }}>
                <Avatar member={m} size={40} />
                <Text style={[t.h, { flex: 1 }]}>{m.name}</Text>
                {m.id === state.meId && <Text style={{ fontFamily: J, fontSize: 13, color: '#fff', backgroundColor: c.ink, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' }}>나</Text>}
              </PressableScale>
            ))}
          </View>
          <Button title={demo ? '진짜 여행 만들러 가기' : '다른 여행방으로'} emoji={demo ? '🎒' : '🚪'} kind="plain" fg={c.sub}
            onPress={() => { setMembersOpen(false); leave(); }} />
        </Sheet>
        <StatusBar style="dark" />
      </View>
    </UIContext.Provider>
  );
}

function Root() {
  const hasTrip = useHasTrip();
  const { mode } = useSession();
  if (!hasTrip) {
    // 서버 여행을 여는 중이면 잠깐 로딩 화면
    return mode === 'remote' ? <LoadingTrip /> : <WelcomeScreen />;
  }
  return <Shell />;
}

function LoadingTrip() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgTop, gap: 8 }}>
      <Text style={{ fontSize: 44 }}>🧳</Text>
      <Text style={t.note}>여행방 여는 중…</Text>
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({ Jua_400Regular, GowunDodum_400Regular });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bgTop }} />;
  return (
    <SafeAreaProvider>
      <TripProvider>
        <Root />
      </TripProvider>
    </SafeAreaProvider>
  );
}
