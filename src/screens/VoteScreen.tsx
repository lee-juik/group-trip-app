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
import { c, categoryStyle, J, softShadow, t } from '../theme';
import { CATEGORIES, Category, Trip, Vote } from '../types';

/** 마감됐거나 전원 투표했을 때만 결과를 공개한다 */
export function tally(vote: Vote, trip: Trip) {
  const total = trip.members.length;
  const counts: Record<string, number> = vote.counts ?? {};
  const voted = vote.voters.length;
  const revealed = !!vote.counts;
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

function OptionRow({ emoji, tint, label, sub, picked, revealed, count, total, winner, disabled, onPress }: {
  emoji: string; tint: string; label: string; sub?: string; picked: boolean; revealed: boolean; count: number; total: number; winner: boolean; disabled: boolean; onPress: () => void;
}) {
  const fill = useSharedValue(0);
  const pop = useSharedValue(picked ? 1 : 0);
  useEffect(() => { fill.value = revealed ? withDelay(150, withSpring(count / total, { damping: 16, stiffness: 80 })) : 0; }, [revealed, count, total]);
  useEffect(() => { pop.value = withSpring(picked ? 1 : 0, { damping: 9, stiffness: 300 }); }, [picked]);
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const check = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }], opacity: pop.value }));

  return (
    <PressableScale disabled={disabled} scaleTo={0.97} onPress={onPress}
      style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: '#F8F5FF', borderWidth: 2.5, borderColor: picked ? (winner ? '#8FD9B6' : '#B9A2FF') : 'transparent' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: winner ? c.mint : c.lilac }, bar]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={t.label}>{label}</Text>
          {sub && <Text style={[t.note, { fontSize: 12 }]} numberOfLines={1}>{sub}</Text>}
        </View>
        {revealed ? (
          <Text style={{ fontFamily: J, fontSize: 17, color: winner ? c.green : c.ink }}>{winner ? '👑 ' : ''}{count}표</Text>
        ) : (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={[{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }, check]}>
              <Text style={{ color: '#fff', fontFamily: J, fontSize: 14 }}>✓</Text>
            </Animated.View>
          </View>
        )}
      </View>
    </PressableScale>
  );
}

function VoteCard({ vote, index }: { vote: Vote; index: number }) {
  const { state, dispatch } = useTrip();
  const { trip, meId } = state;
  const r = tally(vote, trip);
  const place = (id: string) => trip.places.find((p) => p.id === id);
  const label = (id: string) => (id === 'yes' ? '좋아요' : id === 'no' ? '별로예요' : place(id)?.name ?? '?');
  const options = vote.kind === 'yesno' ? ['yes', 'no'] : vote.optionIds;
  const look = (id: string) => {
    if (id === 'yes') return { emoji: '🙆', tint: c.mint };
    if (id === 'no') return { emoji: '🙅', tint: c.peach };
    const p = place(id);
    return { emoji: p?.emoji ?? (p ? categoryStyle[p.category].emoji : '❔'), tint: p ? categoryStyle[p.category].bg : c.lilac };
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(16)} layout={LinearTransition.springify().damping(16)}
      style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 18, gap: 12 }, softShadow]}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Text style={{ fontFamily: J, fontSize: 12, color: c.lilacDeep, backgroundColor: c.lilac, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, overflow: 'hidden' }}>🤫 비밀 투표</Text>
        <Text style={{ fontFamily: J, fontSize: 12, color: vote.closed ? c.sub : c.orange, backgroundColor: vote.closed ? '#F1EEF8' : c.peach, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, overflow: 'hidden' }}>
          ⏰ {vote.closed ? '마감됨' : remaining(vote.deadline)}
        </Text>
      </View>

      <Text style={[t.title, { fontSize: 21, lineHeight: 28 }]}>{vote.title}</Text>
      {vote.kind === 'yesno' && <Text style={t.note}>{place(vote.optionIds[0])?.name}, 다들 어때요?</Text>}

      <View style={{ gap: 8 }}>
        {options.map((o) => (
          <OptionRow
            key={o}
            {...look(o)}
            label={label(o)}
            sub={vote.kind === 'single' ? place(o)?.summary : undefined}
            picked={vote.myChoice === o}
            revealed={r.revealed}
            count={r.counts[o] ?? 0}
            total={r.total}
            winner={r.revealed && r.majority === o}
            disabled={vote.closed}
            onPress={() => dispatch({ type: 'castVote', voteId: vote.id, optionId: o })}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {trip.members.map((m) => {
          const done = vote.voters.includes(m.id);
          return (
            <View key={m.id} style={{ opacity: done ? 1 : 0.35 }}>
              <Avatar member={m} size={30} />
              {done && (
                <Animated.View entering={ZoomIn.springify()} style={{ position: 'absolute', right: -4, bottom: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#8FD9B6', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 8, fontFamily: J }}>✓</Text>
                </Animated.View>
              )}
            </View>
          );
        })}
        <Text style={[t.small, { marginLeft: 4, color: c.sub }]}>{r.voted}/{r.total}명 참여</Text>
      </View>

      {!r.revealed && <Text style={[t.note, { fontSize: 12 }]}>다 같이 투표하거나 마감되면 결과가 열려요. 누가 뭘 골랐는지는 끝까지 비밀!</Text>}

      {r.revealed && (
        <Animated.View entering={ZoomIn.springify().damping(12)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 22, backgroundColor: r.majority ? c.mint : c.butter }}>
          <Text style={{ fontSize: 26 }}>{r.majority ? '🎉' : '🤔'}</Text>
          <Text style={[t.label, { flex: 1, color: r.majority ? c.green : '#A07A12' }]}>
            {r.majority ? `과반수로 결정! ${label(r.majority)}` : '과반을 넘은 곳이 없어요'}
          </Text>
        </Animated.View>
      )}

      {r.revealed && !r.majority && vote.kind === 'single' && (
        <Button title="상위 2곳으로 다시 투표" emoji="🔁" kind="soft"
          onPress={() => {
            dispatch({ type: 'closeVote', voteId: vote.id });
            dispatch({ type: 'createVote', title: `[재투표] ${vote.title}`, optionIds: r.ranked.slice(0, 2), deadline: new Date(Date.now() + 864e5).toISOString() });
          }} />
      )}
      {!vote.closed && !r.revealed && (
        <Button title="지금 마감하기" kind="plain" fg={c.sub} style={{ paddingVertical: 4 }} onPress={() => { success(); dispatch({ type: 'closeVote', voteId: vote.id }); }} />
      )}
    </Animated.View>
  );
}

export function VoteScreen() {
  const { state, dispatch } = useTrip();
  const { trip, meId } = state;
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<Category>('숙소');
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState('2');
  const waiting = trip.votes.filter((v) => !v.closed && !v.myChoice).length;

  const start = () => {
    success();
    const deadline = new Date(Date.now() + Number(days || '1') * 864e5).toISOString();
    dispatch({ type: 'createVote', title: title || `${cat} 어디로 할까요?`, optionIds: picked, deadline });
    setOpen(false); setPicked([]); setTitle('');
  };

  return (
    <>
      <LargeHeaderScreen
        greeting={waiting ? `내 표를 기다리는 투표 ${waiting}개` : '모든 투표에 참여했어요'}
        title="다 같이 정해요 🙋"
        compactTitle="투표"
        right={<MeButton />}
      >
        <Button title="새 투표 열기" emoji="📣" onPress={() => setOpen(true)} />
        {trip.votes.map((v, i) => <VoteCard key={v.id} vote={v} index={i} />)}
      </LargeHeaderScreen>

      <Sheet visible={open} title="새 투표 📣" onClose={() => setOpen(false)}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((k) => (
            <Pill key={k} label={k} emoji={categoryStyle[k].emoji} on={cat === k} onPress={() => { setCat(k); setPicked([]); }} />
          ))}
        </View>
        <Group label="후보 고르기 (하나만 고르면 찬반 투표)">
          {trip.places.filter((p) => p.category === cat).map((p, i) => {
            const on = picked.includes(p.id);
            return (
              <PressableScale key={p.id} scaleTo={0.98} onPress={() => setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1.5 : 0, borderColor: c.line }}>
                <Text style={{ fontSize: 22 }}>{p.emoji ?? categoryStyle[p.category].emoji}</Text>
                <Text style={[t.label, { flex: 1 }]}>{p.name}</Text>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: on ? c.ink : c.line, alignItems: 'center', justifyContent: 'center' }}>
                  {on && <Text style={{ color: '#fff', fontFamily: J, fontSize: 13 }}>✓</Text>}
                </View>
              </PressableScale>
            );
          })}
          {trip.places.every((p) => p.category !== cat) && <Text style={[t.note, { padding: 16 }]}>수집함에 {cat} 카드가 아직 없어요.</Text>}
        </Group>
        <Group label="설정">
          <Field label="제목" placeholder={`${cat} 어디로 할까요?`} value={title} onChangeText={setTitle} />
          <Field label="마감" placeholder="2" keyboardType="number-pad" value={days} onChangeText={setDays} last />
        </Group>
        <Text style={[t.note, { marginLeft: 14, marginTop: -4, fontSize: 12 }]}>마감까지 며칠을 줄지 숫자로 적어주세요.</Text>
        <Button title="투표 시작!" emoji="🚀" disabled={!picked.length} onPress={start} />
      </Sheet>
    </>
  );
}
