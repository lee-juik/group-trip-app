import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { useTrip } from '../store';
import { colors, ui } from '../theme';
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

const fmtDeadline = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 마감`;
};

export function VoteScreen() {
  const { state, dispatch } = useTrip();
  const { trip, meId } = state;
  const [creating, setCreating] = useState(false);
  const [cat, setCat] = useState<Category>('숙소');
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState('2');

  const placeName = (id: string) => (id === 'yes' ? '찬성' : id === 'no' ? '반대' : trip.places.find((p) => p.id === id)?.name ?? '?');

  const startVote = () => {
    const deadline = new Date(Date.now() + Number(days || '1') * 864e5).toISOString();
    dispatch({ type: 'createVote', title: title || `${cat} 정하기 투표`, optionIds: picked, deadline });
    setCreating(false);
    setPicked([]);
    setTitle('');
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.pad}>
      {!creating ? (
        <Button title="+ 새 투표 열기" onPress={() => setCreating(true)} />
      ) : (
        <View style={[ui.card, { borderColor: colors.primary }]}>
          <Text style={ui.h2}>새 투표</Text>
          <View style={[ui.row, { flexWrap: 'wrap' }]}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} on={cat === c} onPress={() => { setCat(c); setPicked([]); }} />
            ))}
          </View>
          <Text style={ui.sub}>수집함에서 후보를 고르세요 (1개면 찬반 투표)</Text>
          {trip.places.filter((p) => p.category === cat).map((p) => (
            <Chip
              key={p.id}
              label={`${picked.includes(p.id) ? '☑' : '☐'} ${p.name}`}
              on={picked.includes(p.id)}
              onPress={() => setPicked(picked.includes(p.id) ? picked.filter((x) => x !== p.id) : [...picked, p.id])}
            />
          ))}
          <TextInput style={ui.input} placeholder={`${cat} 정하기 투표`} placeholderTextColor={colors.sub} value={title} onChangeText={setTitle} />
          <View style={ui.row}>
            <Text style={ui.body}>마감까지</Text>
            <TextInput style={[ui.input, { width: 56, textAlign: 'center' }]} keyboardType="number-pad" value={days} onChangeText={setDays} />
            <Text style={ui.body}>일</Text>
          </View>
          <View style={ui.row}>
            <Button title="취소" ghost style={{ flex: 1 }} onPress={() => setCreating(false)} />
            <Button title="투표 시작" style={{ flex: 1 }} disabled={picked.length === 0} onPress={startVote} />
          </View>
        </View>
      )}

      {trip.votes.map((v) => {
        const t = tally(v, trip);
        const myPick = v.ballots[meId];
        const notVoted = trip.members.filter((m) => !v.ballots[m.id]).map((m) => m.name);
        const options = v.kind === 'yesno' ? ['yes', 'no'] : v.optionIds;
        return (
          <View key={v.id} style={ui.card}>
            <Text style={ui.h2}>{v.title}</Text>
            <Text style={ui.sub}>
              {v.kind === 'yesno' ? `찬반 투표 · ${placeName(v.optionIds[0])}` : '하나만 고르기'} · {v.closed ? '마감됨' : fmtDeadline(v.deadline)} · 🔒 비밀 투표
            </Text>
            {options.map((o) => {
              const count = t.counts[o] ?? 0;
              return (
                <Pressable
                  key={o}
                  disabled={v.closed}
                  onPress={() => dispatch({ type: 'castVote', voteId: v.id, optionId: o })}
                  style={[ui.input, myPick === o && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
                >
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <Text style={ui.body}>{myPick === o ? '● ' : '○ '}{placeName(o)}</Text>
                    {t.revealed && <Text style={[ui.body, { fontWeight: '700' }]}>{count}표</Text>}
                  </View>
                  {t.revealed && (
                    <View style={{ height: 6, backgroundColor: colors.line, borderRadius: 3, marginTop: 6 }}>
                      <View style={{ height: 6, width: `${(count / t.total) * 100}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                    </View>
                  )}
                </Pressable>
              );
            })}
            <Text style={ui.sub}>
              {t.voted}/{t.total}명 투표함{notVoted.length ? ` · 아직: ${notVoted.join(', ')}` : ''}
            </Text>
            {!t.revealed && <Text style={ui.sub}>결과는 모두 투표하거나 마감되면 공개돼요. 누가 무엇을 골랐는지는 끝까지 공개되지 않아요.</Text>}
            {t.revealed && (
              <Text style={[ui.body, { fontWeight: '700', color: t.majority ? colors.good : colors.warn }]}>
                {t.majority ? `과반수로 결정: ${placeName(t.majority)}` : '과반을 넘은 후보가 없어요. 상위 후보로 다시 투표해요.'}
              </Text>
            )}
            {t.revealed && !t.majority && v.kind === 'single' && (
              <Button
                title="상위 2개로 재투표"
                ghost
                onPress={() => {
                  dispatch({ type: 'closeVote', voteId: v.id });
                  dispatch({ type: 'createVote', title: `[재투표] ${v.title}`, optionIds: t.ranked.slice(0, 2), deadline: new Date(Date.now() + 864e5).toISOString() });
                }}
              />
            )}
            {!v.closed && <Button title="지금 마감하기" ghost onPress={() => dispatch({ type: 'closeVote', voteId: v.id })} />}
          </View>
        );
      })}
    </ScrollView>
  );
}
