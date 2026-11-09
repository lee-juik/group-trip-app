import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { FlatList, Keyboard, Platform, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, AvatarStack } from '../components/Avatar';
import { tap } from '../components/haptics';
import { MeButton } from '../components/MeButton';
import { PressableScale } from '../components/PressableScale';
import { ChatMessage, useChat } from '../lib/chat';
import { useTrip } from '../store';
import { bgGradient, c, G, J, t } from '../theme';

const hm = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours();
  return `${h < 12 ? '오전' : '오후'} ${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`;
};

type Row = { kind: 'day'; key: string; label: string } | { kind: 'msg'; key: string; m: ChatMessage; first: boolean; last: boolean };

function buildRows(ms: ChatMessage[]): Row[] {
  const rows: Row[] = [];
  ms.forEach((m, i) => {
    const prev = ms[i - 1];
    const next = ms[i + 1];
    const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
    if (newDay) rows.push({ kind: 'day', key: `day-${m.id}`, label: dayLabel(m.createdAt) });
    const near = (a?: ChatMessage) => !!a && a.memberId === m.memberId && Math.abs(Date.parse(a.createdAt) - Date.parse(m.createdAt)) < 3 * 60_000;
    const sameDayNext = next && new Date(next.createdAt).toDateString() === new Date(m.createdAt).toDateString();
    rows.push({ kind: 'msg', key: m.id, m, first: newDay || !near(prev), last: !sameDayNext || !near(next) });
  });
  return rows.reverse(); // 거꾸로 뒤집은 리스트라서 최신이 맨 아래에 보인다
}

export function ChatScreen({ chat }: { chat: ReturnType<typeof useChat> }) {
  const insets = useSafeAreaInsets();
  const { trip, meId } = useTrip().state;
  const [text, setText] = useState('');
  const [kb, setKb] = useState(0);
  const top = Math.max(insets.top, 12);
  const tabSpace = Math.max(insets.bottom, 14) + 4 + 66 + 10;

  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => { a.remove(); b.remove(); };
  }, []);

  const bottom = kb ? kb + 8 : tabSpace;
  const name = (id: string | null) => trip.members.find((m) => m.id === id);
  const send = () => {
    const body = text;
    if (!body.trim()) return;
    tap();
    setText('');
    chat.send(body).catch(() => {}); // 실패하면 말풍선에 '실패'로 남고, 눌러서 다시 보낼 수 있다
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={bgGradient} locations={[0, 0.55, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ position: 'absolute', inset: 0 } as object} />

      <FlatList
        inverted
        data={buildRows(chat.messages)}
        keyExtractor={(r) => r.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingTop: bottom + 70, paddingBottom: top + 70, paddingHorizontal: 14 }}
        ListFooterComponent={chat.loaded && chat.messages.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 6, paddingVertical: 40 }}>
            <Text style={{ fontSize: 40 }}>💬</Text>
            <Text style={t.h}>첫 마디를 남겨보세요!</Text>
            <Text style={t.note}>여행방 멤버끼리만 보여요</Text>
          </View>
        ) : undefined}
        renderItem={({ item: r }) => {
          if (r.kind === 'day') {
            return (
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <Text style={{ fontFamily: J, fontSize: 12, color: c.sub, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 12, overflow: 'hidden' }}>{r.label}</Text>
              </View>
            );
          }
          const mine = r.m.memberId === meId;
          const who = name(r.m.memberId);
          const left = r.m.pending || r.m.failed ? 0 : chat.unreadCount(r.m);
          const time = (r.last || left > 0) ? (
            <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 2, flexShrink: 0 }}>
              {left > 0 && <Text style={{ fontFamily: J, fontSize: 12, color: c.pink }}>{left}</Text>}
              {r.last && <Text style={{ fontFamily: G, fontSize: 11, color: r.m.failed ? c.pink : c.sub }}>{r.m.pending ? '보내는 중' : r.m.failed ? '⚠️ 실패 · 눌러서 다시' : hm(r.m.createdAt)}</Text>}
            </View>
          ) : null;
          return (
            <Animated.View entering={FadeInUp.springify().damping(18)} style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: r.first ? 10 : 3, gap: 6 }}>
              {!mine && <View style={{ width: 34 }}>{r.first && who && <Avatar member={who} size={34} />}</View>}
              <View style={{ maxWidth: '76%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                {!mine && r.first && <Text style={{ fontFamily: J, fontSize: 12, color: c.sub, marginBottom: 3, marginLeft: 4 }}>{who?.name ?? '알 수 없음'}</Text>}
                <View style={{ flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 5 }}>
                  <PressableScale disabled={!r.m.failed} haptic={false} onPress={() => { tap(); chat.retry(r.m.id); }} style={{
                    backgroundColor: mine ? c.ink : '#fff', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14, flexShrink: 1, opacity: r.m.pending ? 0.6 : 1,
                    borderTopRightRadius: mine && r.first ? 6 : 20, borderTopLeftRadius: !mine && r.first ? 6 : 20,
                    borderWidth: r.m.failed ? 2 : 0, borderColor: c.pink,
                  }}>
                    <Text style={{ fontFamily: G, fontSize: 15, lineHeight: 21, color: mine ? '#fff' : c.ink }}>{r.m.body}</Text>
                  </PressableScale>
                  {time}
                </View>
              </View>
            </Animated.View>
          );
        }}
      />

      {/* 위쪽 제목 */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <BlurView intensity={60} tint="light" style={{ paddingTop: top + 6, paddingBottom: 12, paddingHorizontal: 18, backgroundColor: 'rgba(255,248,244,0.75)', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={t.title}>💬 우리끼리 수다방</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AvatarStack members={trip.members} size={20} max={6} />
              <Text style={t.note}>{trip.members.length}명</Text>
            </View>
          </View>
          <PressableScale onPress={() => { tap(); chat.reload(); }} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15 }}>🔄</Text>
          </PressableScale>
          <MeButton />
        </BlurView>
      </View>

      {/* 입력창 */}
      <View style={{ position: 'absolute', left: 14, right: 14, bottom, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, minHeight: 48, justifyContent: 'center', boxShadow: '0 6px 18px rgba(120,100,180,0.14)' } as object}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="메시지 보내기"
            placeholderTextColor={c.faint}
            multiline
            maxLength={2000}
            {...(Platform.OS === 'web' ? { rows: 1 } : {})}
            onKeyPress={(e) => {
              const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) { (e as unknown as { preventDefault: () => void }).preventDefault(); send(); }
            }}
            style={{ fontFamily: G, fontSize: 16, color: c.ink, paddingVertical: 12, maxHeight: 110, resize: 'none', outlineStyle: 'none' } as object}
          />
        </View>
        <PressableScale onPress={send} disabled={!text.trim()} scaleTo={0.88}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: text.trim() ? c.pink : c.lilac, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, color: '#fff', fontFamily: J }}>↑</Text>
        </PressableScale>
      </View>
    </View>
  );
}
