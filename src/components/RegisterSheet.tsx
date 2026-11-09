import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { normTime, parseLatLng } from '../lib/util';
import { useTrip } from '../store';
import { c, categoryStyle, G, t } from '../theme';
import { CATEGORIES, Category, PlaceCard, PlaceInput } from '../types';
import { Button } from './Button';
import { Field, Group } from './Field';
import { success } from './haptics';
import { Pill } from './Pill';
import { Sheet } from './Sheet';
import { TimeField } from './TimeField';

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/**
 * 가고 싶은 곳을 직접 적어서 등록. 날짜를 고르면 일정에도 바로 들어간다.
 * initial을 주면 그 카드를 고치는 모드
 */
export function RegisterSheet({ visible, onClose, initial }: { visible: boolean; onClose: () => void; initial?: PlaceCard }) {
  const { state, dispatch } = useTrip();
  const { trip } = state;
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('맛집');
  const [area, setArea] = useState('');
  const [memo, setMemo] = useState('');
  const [link, setLink] = useState('');
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [time, setTime] = useState('12:00');

  // 열릴 때마다 비우거나(새로 넣기) 기존 값으로 채운다(고치기)
  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? ''); setCategory(initial?.category ?? '맛집'); setArea(initial?.area ?? '');
    setMemo(initial?.summary ?? ''); setLink(initial?.sourceUrl ?? ''); setDayIndex(null); setTime('12:00');
  }, [visible, initial?.id]);

  const coords = parseLatLng(link);
  const normalized = normTime(time);
  const dup = !initial && trip.places.find((p) => p.name.replace(/\s/g, '').toLowerCase() === name.replace(/\s/g, '').toLowerCase());

  const save = () => {
    success();
    const base = { name: name.trim(), category, area: area.trim(), summary: memo.trim(), sourceUrl: link.trim() || undefined };
    if (initial) {
      const patch: Partial<PlaceInput> = { ...base };
      if (category !== initial.category) patch.emoji = categoryStyle[category].emoji;
      if (coords) { patch.lat = coords.lat; patch.lng = coords.lng; }
      dispatch({ type: 'updatePlace', placeId: initial.id, patch });
    } else {
      dispatch({
        type: 'registerPlace',
        place: { ...base, emoji: categoryStyle[category].emoji, lat: coords?.lat, lng: coords?.lng },
        dayIndex: dayIndex ?? undefined,
        time: dayIndex != null && normalized ? normalized : undefined,
      });
    }
    onClose();
  };

  return (
    <Sheet visible={visible} title={initial ? '카드 고치기 ✏️' : '가고 싶은 곳 추가 ✏️'} onClose={onClose}>
      <Group>
        <Field label="이름" placeholder="예: 스프카레 가라쿠" value={name} onChangeText={setName} maxLength={40} />
        <Field label="동네" placeholder="예: 스스키노 (선택)" value={area} onChangeText={setArea} maxLength={20} />
        <Field label="링크" placeholder="인스타·구글맵 링크 (선택)" value={link} onChangeText={setLink} autoCapitalize="none" autoCorrect={false} keyboardType="url" last />
      </Group>
      <Text style={[t.note, { marginHorizontal: 6, marginTop: -6, color: coords ? c.green : c.sub }]}>
        {coords ? '🧭 지도 위치를 읽었어요. 동선 정리와 지도 보기에 쓰여요.' : '구글맵 주소창의 긴 주소(@위도,경도 포함)를 넣으면 지도 위치도 저장돼요.'}
      </Text>
      {dup && <Text style={[t.note, { marginHorizontal: 6, color: c.orange }]}>같은 이름의 카드가 이미 있어요. 등록하면 그 카드에 하트와 메모가 합쳐져요.</Text>}

      <Text style={[t.small, { marginLeft: 14 }]}>종류</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CATEGORIES.map((k) => <Pill key={k} label={k} emoji={categoryStyle[k].emoji} on={category === k} onPress={() => setCategory(k)} />)}
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 16 }}>
        <TextInput multiline value={memo} onChangeText={setMemo} placeholder="메모 (웨이팅, 가격, 예약 여부 등)" placeholderTextColor={c.faint} maxLength={500}
          style={{ fontFamily: G, fontSize: 15, minHeight: 60, color: c.ink, textAlignVertical: 'top', outlineStyle: 'none' } as object} />
      </View>

      {!initial && (
        <>
          <Text style={[t.small, { marginLeft: 14 }]}>언제 갈까요?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pill label="아직 몰라요" on={dayIndex === null} onPress={() => setDayIndex(null)} />
            {trip.days.map((d, i) => <Pill key={d.date} label={`${i + 1}일 · ${md(d.date)}`} on={dayIndex === i} onPress={() => setDayIndex(i)} />)}
          </ScrollView>
          {dayIndex !== null && (
            <Group><TimeField label="⏰ 시간" value={time} onChange={setTime} last /></Group>
          )}
          <Text style={[t.note, { marginHorizontal: 6 }]}>
            {dayIndex === null ? '모아보기에만 들어가요. 나중에 일정 탭에서 날짜에 넣을 수 있어요.'
              : normalized ? `모아보기와 ${dayIndex + 1}일차 ${normalized}에 같이 들어가요.` : '시간을 골라주세요.'}
          </Text>
        </>
      )}

      <Button title={initial ? '저장하기' : '등록하기'} emoji={initial ? '💾' : '📌'} disabled={!name.trim() || (!initial && dayIndex !== null && !normalized)} onPress={save} />
    </Sheet>
  );
}
