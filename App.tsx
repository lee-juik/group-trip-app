import * as Clipboard from 'expo-clipboard';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from './src/components/Avatar';
import { Button } from './src/components/Button';
import { success } from './src/components/haptics';
import { PressableScale } from './src/components/PressableScale';
import { Sheet } from './src/components/Sheet';
import { TabBar, TabDef } from './src/components/TabBar';
import { fontMap } from './src/fonts';
import { useChat, useUnread } from './src/lib/chat';
import { removeMember } from './src/lib/remote';
import { confirmAsync, hhmm, showError } from './src/lib/util';
import { ChatScreen } from './src/screens/ChatScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { PoolScreen } from './src/screens/PoolScreen';
import { VoteScreen } from './src/screens/VoteScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { TripProvider, useHasTrip, useSession, useTrip } from './src/store';
import { c, G, J, t } from './src/theme';
import { UIContext } from './src/ui';

/** 배포 주소. 초대 메시지에 넣어 친구가 링크만 눌러도 코드가 채워진 채 열린다 */
export const APP_URL = 'https://lee-juik.github.io/group-trip-app/';

function Shell() {
  const { state, dispatch } = useTrip();
  const [tab, setTab] = useState('pool');
  const [membersOpen, setMembersOpen] = useState(false);
  const { mode, leave } = useSession();
  const demo = mode === 'demo';
  const [copied, setCopied] = useState(false);
  const chat = useChat();
  const unread = useUnread(chat, tab === 'chat');
  const pendingVotes = state.trip.votes.filter((v) => !v.closed && !v.myChoice && Date.parse(v.deadline) > Date.now()).length;
  const code = state.trip.inviteCode ?? '';
  const invite = `${state.trip.title} 같이 짜자! ✈️\n${APP_URL}?code=${code}\n(초대 코드 ${code})`;
  const flashCopied = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const shareInvite = async () => {
    if (Platform.OS === 'web') {
      const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
      if (nav.share) { try { await nav.share({ text: invite }); } catch { /* 공유창을 닫은 경우 */ } return; }
      await Clipboard.setStringAsync(invite); flashCopied(); return;
    }
    await Share.share({ message: invite });
  };
  const isHost = !demo && state.trip.hostId === state.meId;
  const kick = async (m: { id: string; name: string }) => {
    if (!(await confirmAsync(`${m.name} 님을 내보낼까요?`, '하트, 투표, 읽음 기록이 같이 지워져요.', '내보내기', true))) return;
    try { await removeMember(m.id); success(); } catch (e) { showError('내보내기 실패', e); }
  };
  const copyCode = async () => { await Clipboard.setStringAsync(code); success(); flashCopied(); };
  const doLeave = async () => {
    if (!demo && !(await confirmAsync('다른 여행방으로 갈까요?', '초대 코드와 같은 이름으로 다시 들어오면 그대로 이어져요.', '나가기'))) return;
    setMembersOpen(false); leave();
  };

  const tabs: TabDef[] = [
    { key: 'pool', label: '모아보기', emoji: '📌' },
    { key: 'vote', label: '투표', emoji: '✅', badge: pendingVotes },
    { key: 'plan', label: '일정', emoji: '🗺️' },
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
        <SyncBanner />
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
          {isHost && (
            <PressableScale scaleTo={0.98} onPress={() => dispatch({ type: 'setJoinLocked', locked: !state.trip.joinLocked })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 22, padding: 14 }}>
              <Text style={{ fontSize: 24 }}>{state.trip.joinLocked ? '🔒' : '🔓'}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={t.label}>{state.trip.joinLocked ? '새 멤버 입장 막아둠' : '새 멤버 들어올 수 있음'}</Text>
                <Text style={t.note}>{state.trip.joinLocked ? '있는 멤버는 같은 이름으로 다시 들어올 수 있어요' : '다 모였으면 막아두는 게 안전해요'}</Text>
              </View>
              <Text style={{ fontFamily: J, fontSize: 13, color: c.lilacDeep, backgroundColor: c.lilac, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, overflow: 'hidden' }}>{state.trip.joinLocked ? '열기' : '막기'}</Text>
            </PressableScale>
          )}
          <View style={{ backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' }}>
            {state.trip.members.map((m, i) => (
              <PressableScale key={m.id} scaleTo={0.98} disabled={!demo}
                onPress={() => { dispatch({ type: 'setMe', memberId: m.id }); setMembersOpen(false); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1.5 : 0, borderColor: c.line }}>
                <Avatar member={m} size={40} />
                <Text style={[t.h, { flex: 1 }]}>{m.name}{m.id === state.trip.hostId && !demo ? ' 👑' : ''}</Text>
                {isHost && m.id !== state.meId && (
                  <PressableScale onPress={() => kick(m)} hitSlop={6} style={{ backgroundColor: c.pinkSoft, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 12 }}>
                    <Text style={{ fontFamily: J, fontSize: 13, color: c.pink }}>내보내기</Text>
                  </PressableScale>
                )}
                {m.id === state.meId && <Text style={{ fontFamily: J, fontSize: 13, color: '#fff', backgroundColor: c.ink, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' }}>나</Text>}
              </PressableScale>
            ))}
          </View>
          {isHost && <Text style={[t.note, { marginHorizontal: 6 }]}>모르는 이름이나 중복된 이름이 있으면 '내보내기'로 정리해 주세요.</Text>}
          <Button title={demo ? '진짜 여행 만들러 가기' : '다른 여행방으로'} emoji={demo ? '🎒' : '🚪'} kind="plain" fg={c.sub} onPress={doLeave} />
        </Sheet>
        <StatusBar style="dark" />
      </View>
    </UIContext.Provider>
  );
}

/** 서버에 못 닿을 때 탭 바 위에 떠 있는 알림. 저장본으로 보고 있다는 뜻 */
function SyncBanner() {
  const { sync, retry } = useSession();
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState(false);
  // 앱을 켠 직후 잠깐 저장본을 보여주는 순간에는 깜빡이지 않도록 조금 기다린다
  useEffect(() => {
    if (sync.status !== 'offline') { setShow(false); return; }
    const id = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(id);
  }, [sync.status]);
  if (!show) return null;
  return (
    <Animated.View entering={FadeIn.duration(200)} pointerEvents="box-none"
      style={{ position: 'absolute', left: 18, right: 18, bottom: Math.max(insets.bottom, 14) + 4 + 66 + 10, alignItems: 'center' }}>
      <PressableScale onPress={retry} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.ink, borderRadius: 18, paddingVertical: 9, paddingHorizontal: 14, maxWidth: '100%' }}>
        <Text style={{ fontFamily: G, fontSize: 13, color: '#fff' }} numberOfLines={1}>📵 인터넷이 약해요{sync.lastAt ? ` · ${hhmm(sync.lastAt)} 저장본` : ''}</Text>
        <Text style={{ fontFamily: J, fontSize: 13, color: '#FFD3C2' }}>다시 시도</Text>
      </PressableScale>
    </Animated.View>
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

/** 여행방을 서버에서 여는 동안. 오래 걸리거나 실패하면 다시 시도/나가기를 보여준다 */
function LoadingTrip() {
  const { sync, retry, leave } = useSession();
  const [slow, setSlow] = useState(false);
  useEffect(() => { const id = setTimeout(() => setSlow(true), 6000); return () => clearTimeout(id); }, []);
  const stuck = sync.status === 'offline' || slow;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgTop, gap: 10, padding: 30 }}>
      <Text style={{ fontSize: 44 }}>🧳</Text>
      <Text style={[t.note, { textAlign: 'center' }]}>{stuck ? (sync.message ?? '인터넷 연결이 약해요. 잠시 후 다시 해 주세요.') : '여행방 여는 중…'}</Text>
      {stuck && (
        <>
          <Button title="다시 시도" emoji="🔄" kind="soft" onPress={retry} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          <Button title="다른 여행방으로" kind="plain" fg={c.sub} onPress={leave} />
        </>
      )}
    </View>
  );
}

/** 화면 어딘가에서 오류가 나도 앱 전체가 하얗게 죽지 않게 받아준다 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgTop, gap: 10, padding: 30 }}>
        <Text style={{ fontSize: 44 }}>😵</Text>
        <Text style={t.h}>앗, 화면에 문제가 생겼어요</Text>
        <Text style={[t.note, { textAlign: 'center' }]} numberOfLines={4}>{this.state.error.message}</Text>
        <Button title="다시 열기" emoji="🔄" style={{ marginTop: 8 }}
          onPress={() => { if (Platform.OS === 'web') window.location.reload(); else this.setState({ error: undefined }); }} />
      </View>
    );
  }
}

export default function App() {
  const [loaded, fontError] = useFonts(fontMap);
  // 글꼴이 4초 안에 안 오면 기본 글꼴로라도 먼저 보여준다 (글꼴은 오는 대로 바뀐다)
  const [waited, setWaited] = useState(false);
  useEffect(() => { const id = setTimeout(() => setWaited(true), 4000); return () => clearTimeout(id); }, []);
  if (!loaded && !fontError && !waited) return <View style={{ flex: 1, backgroundColor: c.bgTop }} />;
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <TripProvider>
          <Root />
        </TripProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
