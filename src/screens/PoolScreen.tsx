import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { AvatarStack } from '../components/Avatar';
import { Button } from '../components/Button';
import { success } from '../components/haptics';
import { HeartButton } from '../components/HeartButton';
import { LargeHeaderScreen } from '../components/LargeHeaderScreen';
import { MeButton } from '../components/MeButton';
import { Pill } from '../components/Pill';
import { PressableScale } from '../components/PressableScale';
import { Sheet } from '../components/Sheet';
import { guessFromSharedText, useTrip } from '../store';
import { extractPlace, PlaceDraft } from '../lib/remote';
import { c, categoryStyle, G, J, softShadow, t } from '../theme';
import { CATEGORIES, Category, PlaceCard } from '../types';

function DdayCard() {
  const { trip } = useTrip().state;
  const first = trip.days[0].date;
  const dday = Math.ceil((Date.parse(`${first}T00:00:00`) - Date.now()) / 864e5);
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} style={{ borderRadius: 32, padding: 20, backgroundColor: '#F3DDF0', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', inset: 0, backgroundColor: '#E3D7FF', opacity: 0.6, transform: [{ skewY: '-12deg' }, { translateY: 60 }] } as object} />
      <View style={{ position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.38)', right: -30, top: -44 }} />
      <View style={{ position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', right: 70, bottom: -30 }} />
      <Text style={{ fontFamily: J, fontSize: 14, color: c.lilacDeep }}>출발까지</Text>
      <Text style={{ fontFamily: J, fontSize: 48, lineHeight: 54, color: '#fff', textShadowColor: 'rgba(160,110,200,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 }}>
        {dday > 0 ? `D-${dday}` : 'D-DAY'}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <AvatarStack members={trip.members} size={32} />
        <Text style={{ fontFamily: J, fontSize: 14, color: c.lilacDeep }}>{trip.members.length}명이 함께 가요</Text>
      </View>
    </Animated.View>
  );
}

function PlaceTile({ p, index }: { p: PlaceCard; index: number }) {
  const { state, dispatch } = useTrip();
  const cs = categoryStyle[p.category];
  const members = p.wantedBy.map((id) => state.trip.members.find((m) => m.id === id)!).filter(Boolean);
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify().damping(16)}
      layout={LinearTransition.springify().damping(16)}
      style={{ width: '48%' }}
    >
      <PressableScale scaleTo={0.96} style={{ backgroundColor: cs.bg, borderRadius: 28, padding: 14, minHeight: 186, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ width: 54, height: 54, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28 }}>{p.emoji ?? cs.emoji}</Text>
          </View>
          <HeartButton on={p.wantedBy.includes(state.meId)} count={p.wantedBy.length} onPress={() => dispatch({ type: 'toggleWant', placeId: p.id })} />
        </View>
        <Text style={[t.h, { marginTop: 8 }]} numberOfLines={2}>{p.name}</Text>
        <Text style={t.note} numberOfLines={3}>{p.summary}</Text>
        <View style={{ flex: 1 }} />
        {members.length > 0 && <View style={{ marginTop: 6 }}><AvatarStack members={members} size={22} /></View>}
      </PressableScale>
    </Animated.View>
  );
}

export function PoolScreen() {
  const { state, dispatch } = useTrip();
  const { trip, meId } = state;
  const me = trip.members.find((m) => m.id === meId)!;
  const [filter, setFilter] = useState<Category | '전체'>('전체');
  const [sheet, setSheet] = useState(false);
  const [shared, setShared] = useState('');
  const [draft, setDraft] = useState<PlaceDraft | null>(null);
  const [thinking, setThinking] = useState(false);
  const [aiNote, setAiNote] = useState<string>();
  const makeCard = async () => {
    setThinking(true); setAiNote(undefined);
    try {
      setDraft(await extractPlace(shared, trip.city));
    } catch {
      setDraft({ ...guessFromSharedText(shared), area: '' });
      setAiNote('AI 요약이 안 돼서 글에서 대충 뽑았어요. 고쳐서 넣어주세요.');
    } finally { setThinking(false); }
  };

  const places = useMemo(
    () => trip.places.filter((p) => filter === '전체' || p.category === filter).sort((a, b) => b.wantedBy.length - a.wantedBy.length),
    [trip.places, filter],
  );
  const close = () => { setSheet(false); setDraft(null); setShared(''); setAiNote(undefined); };

  return (
    <>
      <LargeHeaderScreen greeting={`${me.name} 님, 안녕!`} title={`${trip.city} 가서\n뭐 먹고 뭐 할까? ☃️`} compactTitle="모아보기" right={<MeButton />}>
        <DdayCard />

        <Button title="인스타 게시물 넣기" emoji="📮" kind="soft" onPress={() => setSheet(true)} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingVertical: 6 }}>
          <Pill label="전체" on={filter === '전체'} onPress={() => setFilter('전체')} />
          {CATEGORIES.map((k) => (
            <Pill key={k} label={k} emoji={categoryStyle[k].emoji} on={filter === k} onPress={() => setFilter(k)} />
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
          {places.map((p, i) => <PlaceTile key={p.id} p={p} index={i} />)}
        </View>
        {places.length === 0 && <Text style={[t.note, { textAlign: 'center', paddingVertical: 30 }]}>아직 비어 있어요. 인스타에서 하나 넣어볼까요?</Text>}
      </LargeHeaderScreen>

      <Sheet visible={sheet} title={draft ? '이렇게 만들까요? ✨' : '게시물 넣기 📮'} onClose={close}>
        {!draft ? (
          <>
            <Text style={t.note}>인스타 게시물 링크를 붙여넣으면 AI가 읽고 장소 카드로 정리해줘요. 캡션까지 같이 붙여넣으면 더 정확해요.</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 16 }}>
              <TextInput
                multiline
                autoFocus
                placeholder={'📍스프카레 가라쿠 삿포로 오면 꼭 가야하는 맛집\nhttps://instagram.com/p/...'}
                placeholderTextColor={c.faint}
                value={shared}
                onChangeText={setShared}
                style={{ fontFamily: G, fontSize: 16, minHeight: 110, color: c.ink, textAlignVertical: 'top', outlineStyle: 'none' } as object}
              />
            </View>
            <Button title={thinking ? 'AI가 읽는 중…' : '카드 만들기'} emoji={thinking ? '🔎' : '✨'} disabled={!shared.trim() || thinking} onPress={makeCard} />
          </>
        ) : (
          <Animated.View entering={FadeInDown.springify().damping(16)} style={{ gap: 12 }}>
            <View style={{ backgroundColor: categoryStyle[draft.category].bg, borderRadius: 28, padding: 18, gap: 6 }}>
              <Text style={{ fontSize: 32 }}>{draft.emoji ?? categoryStyle[draft.category].emoji}</Text>
              <TextInput value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} style={[t.title, { paddingVertical: 2, outlineStyle: 'none' } as object]} />
              <TextInput value={draft.area} placeholder="동네 (예: 스스키노)" placeholderTextColor={c.sub} onChangeText={(area) => setDraft({ ...draft, area })} style={[t.label, { color: c.sub, outlineStyle: 'none' } as object]} />
              <TextInput value={draft.summary} multiline onChangeText={(summary) => setDraft({ ...draft, summary })} style={[t.body, { outlineStyle: 'none' } as object]} />
            </View>
            {aiNote && <Text style={[t.note, { color: c.orange }]}>{aiNote}</Text>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((k) => (
                <Pill key={k} label={k} emoji={categoryStyle[k].emoji} on={draft.category === k} onPress={() => setDraft({ ...draft, category: k })} />
              ))}
            </View>
            <Button title="수집함에 쏙 넣기" emoji="📌" disabled={!draft.name.trim()}
              onPress={() => { success(); dispatch({ type: 'addPlace', place: draft }); close(); }} />
          </Animated.View>
        )}
      </Sheet>
    </>
  );
}
