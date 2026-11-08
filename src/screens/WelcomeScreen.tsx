import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Field, Group } from '../components/Field';
import { success, tap } from '../components/haptics';
import { PressableScale } from '../components/PressableScale';
import { useSession } from '../store';
import { bgGradient, c, J, softShadow, t } from '../theme';

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

function ChoiceCard({ emoji, title, sub, bg, on, onPress }: { emoji: string; title: string; sub: string; bg: string; on: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.97}
      style={[{ flex: 1, backgroundColor: bg, borderRadius: 28, padding: 16, gap: 6, borderWidth: 2.5, borderColor: on ? c.ink : 'transparent' }, softShadow]}>
      <Text style={{ fontSize: 30 }}>{emoji}</Text>
      <Text style={t.h}>{title}</Text>
      <Text style={t.note}>{sub}</Text>
    </PressableScale>
  );
}

export function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { mode, error, create, join, startDemo } = useSession();
  const [tab, setTab] = useState<'new' | 'join'>('join');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const canJoin = name.trim() && code.trim().length >= 6;
  const canCreate = name.trim() && title.trim() && city.trim() && isDate(start) && isDate(end) && start <= end;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(undefined);
    try { await fn(); success(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  if (mode === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgTop, gap: 12 }}>
        <Text style={{ fontSize: 44 }}>🧳</Text>
        <ActivityIndicator color={c.lilacDeep} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={bgGradient} locations={[0, 0.55, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ position: 'absolute', inset: 0 } as object} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40, paddingHorizontal: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInUp.springify().damping(16)} style={{ gap: 6 }}>
            <Text style={{ fontSize: 46 }}>🧳✨</Text>
            <Text style={[t.hero, { fontSize: 34, lineHeight: 42 }]}>{'우리끼리\n여행 짜기'}</Text>
            <Text style={[t.note, { fontSize: 15 }]}>인스타에서 본 곳 모으고, 몰래 투표하고, 일정까지 한 번에.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).springify().damping(16)} style={{ flexDirection: 'row', gap: 10 }}>
            <ChoiceCard emoji="💌" title="초대받았어요" sub="친구가 준 코드로 들어가기" bg={c.pinkSoft} on={tab === 'join'} onPress={() => { tap(); setTab('join'); }} />
            <ChoiceCard emoji="✈️" title="새 여행 만들기" sub="내가 방장이 될래요" bg={c.sky} on={tab === 'new'} onPress={() => { tap(); setTab('new'); }} />
          </Animated.View>

          <Animated.View layout={LinearTransition.springify().damping(18)} style={{ gap: 12 }}>
            <Group label="나는">
              <Field label="이름" placeholder="친구들이 부르는 이름" value={name} onChangeText={setName} maxLength={12} last />
            </Group>

            {tab === 'join' ? (
              <Animated.View key="join" entering={FadeInDown.springify().damping(18)} style={{ gap: 12 }}>
                <Group label="초대 코드">
                  <Field placeholder="예: C9FF09" value={code} onChangeText={(s) => setCode(s.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={6}
                    style={{ fontFamily: J, fontSize: 24, letterSpacing: 6 }} last />
                </Group>
                <Button title={busy ? '들어가는 중…' : '여행방 들어가기'} emoji="🚪" disabled={!canJoin || busy} onPress={() => run(() => join(code.trim(), name.trim()))} />
              </Animated.View>
            ) : (
              <Animated.View key="new" entering={FadeInDown.springify().damping(18)} style={{ gap: 12 }}>
                <Group label="어디로, 언제?">
                  <Field label="여행 이름" placeholder="삿포로 겨울 여행" value={title} onChangeText={setTitle} maxLength={24} />
                  <Field label="도시" placeholder="삿포로" value={city} onChangeText={setCity} maxLength={16} />
                  <Field label="가는 날" placeholder="2026-12-20" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" maxLength={10} />
                  <Field label="오는 날" placeholder="2026-12-22" value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" maxLength={10} last />
                </Group>
                <Button title={busy ? '만드는 중…' : '여행방 만들기'} emoji="🎒" disabled={!canCreate || busy}
                  onPress={() => run(() => create({ title: title.trim(), city: city.trim(), start, end, name: name.trim() }))} />
              </Animated.View>
            )}
          </Animated.View>

          {(msg || error) && <Text style={[t.note, { color: c.pink, textAlign: 'center' }]}>{msg ?? error}</Text>}

          <Button title="샘플 여행 구경하기" emoji="👀" kind="plain" fg={c.sub} onPress={startDemo} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
