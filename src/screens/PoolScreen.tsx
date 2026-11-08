import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { Sheet } from '../components/Sheet';
import { guessFromSharedText, useTrip } from '../store';
import { c, categoryStyle, font, shadow } from '../theme';
import { CATEGORIES, Category } from '../types';

const md = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`;

function TripHero() {
  const { trip } = useTrip().state;
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  const dday = Math.ceil((Date.parse(`${first}T00:00:00`) - Date.now()) / 864e5);
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[{ borderRadius: 24, overflow: 'hidden' }, shadow]}>
      <LinearGradient colors={['#4F8CFF', '#7A5CFF', '#C77DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' }}>❄️ {trip.city}</Text>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{trip.title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>{md(first)} – {md(last)} · {trip.days.length - 1}박 {trip.days.length}일</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>출발까지</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{dday > 0 ? `D-${dday}` : 'D-DAY'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AvatarStack members={trip.members} size={30} />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{trip.members.map((m) => m.name).join(', ')}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export function PoolScreen() {
  const { state, dispatch } = useTrip();
  const { trip, meId } = state;
  const [filter, setFilter] = useState<Category | '전체'>('전체');
  const [sheet, setSheet] = useState(false);
  const [shared, setShared] = useState('');
  const [draft, setDraft] = useState<ReturnType<typeof guessFromSharedText> | null>(null);

  const member = (id: string) => trip.members.find((m) => m.id === id)!;
  const places = useMemo(
    () => trip.places.filter((p) => filter === '전체' || p.category === filter).sort((a, b) => b.wantedBy.length - a.wantedBy.length),
    [trip.places, filter],
  );
  const close = () => { setSheet(false); setDraft(null); setShared(''); };

  return (
    <>
      <LargeHeaderScreen title="수집함" right={<MeButton />}>
        <TripHero />

        <Button title="인스타 게시물 넣기" icon="logo-instagram" kind="tinted" onPress={() => setSheet(true)} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }} style={{ marginHorizontal: -16 }} contentInset={{ left: 16, right: 16 }}>
          <View style={{ width: 8 }} />
          <Pill label="전체" on={filter === '전체'} onPress={() => setFilter('전체')} color={c.label} />
          {CATEGORIES.map((k) => (
            <Pill key={k} label={k} icon={categoryStyle[k].icon} color={categoryStyle[k].color} on={filter === k} onPress={() => setFilter(k)} />
          ))}
          <View style={{ width: 8 }} />
        </ScrollView>

        {places.map((p, i) => {
          const cs = categoryStyle[p.category];
          return (
            <Animated.View
              key={p.id}
              entering={FadeInDown.delay(i * 45).springify().damping(18)}
              layout={LinearTransition.springify().damping(18)}
              style={[{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 10 }, shadow]}
            >
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${cs.color}22`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={cs.icon as any} size={22} color={cs.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={font.headline}>{p.name}</Text>
                  <Text style={font.footnote}>{p.category}{p.area ? ` · ${p.area}` : ''}</Text>
                </View>
                <HeartButton on={p.wantedBy.includes(meId)} count={p.wantedBy.length} onPress={() => dispatch({ type: 'toggleWant', placeId: p.id })} />
              </View>
              <Text style={[font.subhead, { color: 'rgba(0,0,0,0.75)', lineHeight: 21 }]}>{p.summary}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {p.wantedBy.length > 0 && <AvatarStack members={p.wantedBy.map(member)} size={22} />}
                <Text style={[font.caption, { flex: 1 }]}>
                  {member(p.addedBy).name}님이 올림{p.sourceUrl ? ' · 인스타' : ''}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </LargeHeaderScreen>

      <Sheet visible={sheet} title={draft ? '장소 카드 확인' : '게시물 넣기'} onClose={close}>
        {!draft ? (
          <>
            <Text style={font.footnote}>인스타에서 링크와 캡션을 복사해 붙여넣으면 장소 카드로 만들어요.</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14 }}>
              <TextInput
                multiline
                autoFocus
                placeholder={'📍스프카레 가라쿠 삿포로 오면 꼭 가야하는 맛집\nhttps://instagram.com/p/...'}
                placeholderTextColor={c.label3}
                value={shared}
                onChangeText={setShared}
                style={{ fontSize: 16, minHeight: 100, color: c.label, textAlignVertical: 'top' }}
              />
            </View>
            <Button title="카드 만들기" icon="sparkles" disabled={!shared.trim()} onPress={() => setDraft(guessFromSharedText(shared))} />
          </>
        ) : (
          <Animated.View entering={FadeInDown.springify().damping(18)} style={{ gap: 12 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8 }}>
              <TextInput value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} style={[font.title3, { paddingVertical: 2 }]} />
              <TextInput value={draft.summary} multiline onChangeText={(summary) => setDraft({ ...draft, summary })} style={[font.subhead, { color: c.label2 }]} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((k) => (
                <Pill key={k} label={k} icon={categoryStyle[k].icon} color={categoryStyle[k].color} on={draft.category === k} onPress={() => setDraft({ ...draft, category: k })} />
              ))}
            </View>
            <Button
              title="수집함에 추가"
              icon="add-circle"
              disabled={!draft.name.trim()}
              onPress={() => { success(); dispatch({ type: 'addPlace', place: { ...draft, area: '' } }); close(); }}
            />
          </Animated.View>
        )}
      </Sheet>
    </>
  );
}
