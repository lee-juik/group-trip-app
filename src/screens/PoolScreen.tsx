import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { guessFromSharedText, useTrip } from '../store';
import { colors, ui } from '../theme';
import { CATEGORIES, Category } from '../types';

export function PoolScreen() {
  const { state, dispatch } = useTrip();
  const { trip, meId } = state;
  const [filter, setFilter] = useState<Category | '전체'>('전체');
  const [shared, setShared] = useState('');
  const [draft, setDraft] = useState<ReturnType<typeof guessFromSharedText> | null>(null);

  const nameOf = (id: string) => trip.members.find((m) => m.id === id)?.name ?? '?';
  const places = useMemo(
    () =>
      trip.places
        .filter((p) => filter === '전체' || p.category === filter)
        .sort((a, b) => b.wantedBy.length - a.wantedBy.length),
    [trip.places, filter],
  );

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.pad}>
      <View style={ui.card}>
        <Text style={ui.h2}>인스타 게시물 넣기</Text>
        <Text style={ui.sub}>인스타에서 링크와 캡션을 복사해 붙여넣으면 장소 카드를 만들어요.</Text>
        <TextInput
          style={[ui.input, { minHeight: 70 }]}
          multiline
          placeholder={'예) 📍스프카레 가라쿠 삿포로 오면 꼭 가야하는 맛집\nhttps://instagram.com/p/...'}
          placeholderTextColor={colors.sub}
          value={shared}
          onChangeText={setShared}
        />
        <Button title="장소 카드 만들기" disabled={!shared.trim()} onPress={() => setDraft(guessFromSharedText(shared))} />
      </View>

      {draft && (
        <View style={[ui.card, { borderColor: colors.primary }]}>
          <Text style={ui.h2}>이렇게 만들까요?</Text>
          <TextInput style={ui.input} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
          <View style={[ui.row, { flexWrap: 'wrap' }]}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} on={draft.category === c} onPress={() => setDraft({ ...draft, category: c })} />
            ))}
          </View>
          <TextInput style={ui.input} value={draft.summary} multiline onChangeText={(summary) => setDraft({ ...draft, summary })} />
          <View style={ui.row}>
            <Button title="취소" ghost onPress={() => setDraft(null)} style={{ flex: 1 }} />
            <Button
              title="수집함에 추가"
              style={{ flex: 1 }}
              disabled={!draft.name.trim()}
              onPress={() => {
                dispatch({ type: 'addPlace', place: { ...draft, area: '' } });
                setDraft(null);
                setShared('');
              }}
            />
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {(['전체', ...CATEGORIES] as const).map((c) => (
          <Chip key={c} label={c} on={filter === c} onPress={() => setFilter(c)} />
        ))}
      </ScrollView>

      {places.map((p) => {
        const mine = p.wantedBy.includes(meId);
        return (
          <View key={p.id} style={ui.card}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.h2}>{p.name}</Text>
              <Text style={ui.sub}>{p.category}{p.area ? ` · ${p.area}` : ''}</Text>
            </View>
            <Text style={ui.body}>{p.summary}</Text>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.sub}>
                {nameOf(p.addedBy)}님이 올림 · {p.wantedBy.length}명이 가고 싶어해요
                {p.wantedBy.length ? ` (${p.wantedBy.map(nameOf).join(', ')})` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => dispatch({ type: 'toggleWant', placeId: p.id })}
              style={[ui.chip, mine && ui.chipOn, { alignSelf: 'flex-start' }]}
            >
              <Text style={ui.chipText}>{mine ? '♥ 가고 싶다' : '♡ 가고 싶다'}</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}
