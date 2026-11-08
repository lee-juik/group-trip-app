import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withSpring, ZoomIn } from 'react-native-reanimated';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Field, Group } from '../components/Field';
import { success } from '../components/haptics';
import { LargeHeaderScreen } from '../components/LargeHeaderScreen';
import { MeButton } from '../components/MeButton';
import { Pill } from '../components/Pill';
import { PressableScale } from '../components/PressableScale';
import { Sheet } from '../components/Sheet';
import { useTrip } from '../store';
import { c, categoryStyle, font, shadow } from '../theme';
import { CATEGORIES, Category, Trip, Vote } from '../types';

/** 마감됐거나 전원 투표했을 때만 결과를 공개한다 */
export function tally(vote: Vote, trip: Trip) {
  const total = trip.members.length;
  const counts: Record<string, number> = {};
  Object.values(vote.ballots).forEach((o) => (counts[o] = (counts[o] ?? 0) + 1));
  const voted = Object.keys(vote.ballots).length;
  const revealed = vote.closed || voted === total;
  const options = vote.kind === 'yesno' ? ['yes', 'no'] : vote.optionIds;
  const ranked = [...options].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  const top = ranked[0];
  const majority = (counts[top] ?? 0) > total / 2 ? top : undefined;
  return { counts, voted, total, revealed, ranked, majority };
}

const remaining = (iso: string) => {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return '마감 시간 지남';
  const h = Math.floor(ms / 36e5);
  return h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간 남음` : `${h}시간 남음`;
};

function OptionRow({ label, sub, picked, revealed, count, total, winner, disabled, onPress }: {
  label: string; sub?: string; picked: boolean; revealed: boolean; count: number; total: number; winner: boolean; disabled: boolean; onPress: () => void;
}) {
  const fill = useSharedValue(0);
  const dot = useSharedValue(picked ? 1 : 0);
  useEffect(() => { fill.value = revealed ? withDelay(150, withSpring(count / total, { damping: 18, stiffness: 90 })) : 0; }, [revealed, count, total]);
  useEffect(() => { dot.value = withSpring(picked ? 1 : 0, { damping: 12, stiffness: 300 }); }, [picked]);
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const dotSt = useAnimatedStyle(() => ({ transform: [{ scale: dot.value }], opacity: dot.value }));
  const accent = winner ? c.green : c.blue;

  return (
    <PressableScale disabled={disabled} scaleTo={0.98} onPress={onPress}
      style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: c.bg, borderWidth: 1.5, borderColor: picked ? accent : 'transparent' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: `${accent}26` }, bar]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: picked ? accent : c.label3, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: accent }, dotSt]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[font.callout, { fontWeight: winner ? '700' : '500' }]}>{label}</Text>
          {sub && <Text style={font.caption} numberOfLines={1}>{sub}</Text>}
        </View>
        {winner && <Animated.View entering={ZoomIn.delay(400).springify()}><Ionicons name="trophy" size={18} color={c.green} /></Animated.View>}
        {revealed && <Text style={[font.headline, { color: winner ? c.green : c.label }]}>{count}표</Text>}
      </View>
    </PressableScale>
  );
}

function VoteCard({ vote, index }: { vote: Vote; index: number }) {
  const { state, dispatch } = useTrip();
  const { trip, meId } = state;
  const t = tally(vote, trip);
  const place = (id: string) => trip.places.find((p) => p.id === id);
  const label = (id: string) => (id === 'yes' ? '찬성' : id === 'no' ? '반대' : place(id)?.name ?? '?');
  const options = vote.kind === 'yesno' ? ['yes', 'no'] : vote.optionIds;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(18)} layout={LinearTransition.springify().damping(18)}
      style={[{ backgroundColor: c.card, borderRadius: 22, padding: 16, gap: 12 }, shadow]}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.fill, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 }}>
          <Ionicons name="lock-closed" size={11} color={c.label2} />
          <Text style={[font.caption, { fontWeight: '600' }]}>비밀 투표</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: vote.closed ? c.fill : 'rgba(255,149,0,0.14)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 }}>
          <Ionicons name="time" size={11} color={vote.closed ? c.label2 : c.orange} />
          <Text style={[font.caption, { fontWeight: '600', color: vote.closed ? c.label2 : c.orange }]}>{vote.closed ? '마감됨' : remaining(vote.deadline)}</Text>
        </View>
      </View>

      <Text style={font.title3}>{vote.title}</Text>
      {vote.kind === 'yesno' && <Text style={font.footnote}>{label(vote.optionIds[0])}, 찬성하나요?</Text>}

      <View style={{ gap: 8 }}>
        {options.map((o) => (
          <OptionRow
            key={o}
            label={label(o)}
            sub={vote.kind === 'single' ? place(o)?.summary : undefined}
            picked={vote.ballots[meId] === o}
            revealed={t.revealed}
            count={t.counts[o] ?? 0}
            total={t.total}
            winner={t.revealed && t.majority === o}
            disabled={vote.closed}
            onPress={() => dispatch({ type: 'castVote', voteId: vote.id, optionId: o })}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {trip.members.map((m) => {
            const done = !!vote.ballots[m.id];
            return (
              <View key={m.id} style={{ opacity: done ? 1 : 0.3 }}>
                <Avatar member={m} size={26} />
                {done && (
                  <Animated.View entering={ZoomIn.springify()} style={{ position: 'absolute', right: -3, bottom: -3, backgroundColor: '#fff', borderRadius: 8 }}>
                    <Ionicons name="checkmark-circle" size={14} color={c.green} />
                  </Animated.View>
                )}
              </View>
            );
          })}
        </View>
        <Text style={[font.footnote, { flex: 1 }]}>{t.voted}/{t.total}명 참여</Text>
      </View>

      {!t.revealed && (
        <Text style={font.caption}>모두 투표하거나 마감되면 결과가 열려요. 누가 무엇을 골랐는지는 끝까지 비밀이에요.</Text>
      )}

      {t.revealed && (
        <Animated.View entering={ZoomIn.springify().damping(14)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: t.majority ? 'rgba(52,199,89,0.12)' : 'rgba(255,149,0,0.12)' }}>
          <Ionicons name={t.majority ? 'checkmark-done-circle' : 'refresh-circle'} size={26} color={t.majority ? c.green : c.orange} />
          <Text style={[font.subhead, { flex: 1, fontWeight: '600' }]}>
            {t.majority ? `과반수로 결정됐어요: ${label(t.majority)}` : '과반을 넘은 후보가 없어요'}
          </Text>
        </Animated.View>
      )}

      {t.revealed && !t.majority && vote.kind === 'single' && (
        <Button title="상위 2개로 재투표" icon="refresh" kind="tinted" color={c.orange}
          onPress={() => {
            dispatch({ type: 'closeVote', voteId: vote.id });
            dispatch({ type: 'createVote', title: `[재투표] ${vote.title}`, optionIds: t.ranked.slice(0, 2), deadline: new Date(Date.now() + 864e5).toISOString() });
          }} />
      )}
      {!vote.closed && !t.revealed && (
        <Button title="지금 마감하기" kind="plain" onPress={() => { success(); dispatch({ type: 'closeVote', voteId: vote.id }); }} style={{ paddingVertical: 6 }} />
      )}
    </Animated.View>
  );
}

export function VoteScreen() {
  const { state, dispatch } = useTrip();
  const { trip } = state;
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<Category>('숙소');
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState('2');

  const start = () => {
    success();
    const deadline = new Date(Date.now() + Number(days || '1') * 864e5).toISOString();
    dispatch({ type: 'createVote', title: title || `${cat} 정하기`, optionIds: picked, deadline });
    setOpen(false); setPicked([]); setTitle('');
  };

  return (
    <>
      <LargeHeaderScreen title="투표" right={<MeButton />}>
        <Button title="새 투표 열기" icon="megaphone" onPress={() => setOpen(true)} />
        {trip.votes.map((v, i) => <VoteCard key={v.id} vote={v} index={i} />)}
      </LargeHeaderScreen>

      <Sheet visible={open} title="새 투표" onClose={() => setOpen(false)}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((k) => (
            <Pill key={k} label={k} icon={categoryStyle[k].icon} color={categoryStyle[k].color} on={cat === k} onPress={() => { setCat(k); setPicked([]); }} />
          ))}
        </View>
        <Group label="후보 고르기 (1개면 찬반 투표)">
          {trip.places.filter((p) => p.category === cat).map((p, i) => {
            const on = picked.includes(p.id);
            return (
              <PressableScale key={p.id} scaleTo={0.98} onPress={() => setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 0.5 : 0, borderColor: c.sep }}>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? c.blue : c.label3} />
                <Text style={[font.callout, { flex: 1 }]}>{p.name}</Text>
                <Text style={font.caption}>♥ {p.wantedBy.length}</Text>
              </PressableScale>
            );
          })}
          {trip.places.every((p) => p.category !== cat) && <Text style={[font.footnote, { padding: 14 }]}>수집함에 {cat} 카드가 아직 없어요.</Text>}
        </Group>
        <Group label="설정">
          <Field label="제목" placeholder={`${cat} 정하기`} value={title} onChangeText={setTitle} />
          <Field label="마감" placeholder="2" keyboardType="number-pad" value={days} onChangeText={setDays} last />
        </Group>
        <Text style={[font.caption, { marginLeft: 16, marginTop: -6 }]}>마감까지 며칠을 줄지 숫자로 입력해요.</Text>
        <Button title="투표 시작하기" icon="paper-plane" disabled={!picked.length} onPress={start} />
      </Sheet>
    </>
  );
}
