import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useTrip } from '../store';
import { c, categoryStyle, G, t } from '../theme';
import { CATEGORIES, Category } from '../types';
import { Button } from './Button';
import { Field, Group } from './Field';
import { success } from './haptics';
import { Pill } from './Pill';
import { Sheet } from './Sheet';

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/** 가고 싶은 곳을 직접 적어서 등록. 날짜를 고르면 일정에도 바로 들어간다 */
export function RegisterSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, dispatch } = useTrip();
  const { trip } = state;
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('맛집');
  const [area, setArea] = useState('');
  const [memo, setMemo] = useState('');
  const [link, setLink] = useState('');
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [time, setTime] = useState('12:00');

  const validTime = /^\d{1,2}:\d{2}$/.test(time);
  const reset = () => { setName(''); setArea(''); setMemo(''); setLink(''); setDayIndex(null); setTime('12:00'); setCategory('맛집'); };
  const close = () => { reset(); onClose(); };
  const save = () => {
    success();
    dispatch({
      type: 'registerPlace',
      place: { name: name.trim(), category, area: area.trim(), summary: memo.trim(), sourceUrl: link.trim() || undefined, emoji: categoryStyle[category].emoji },
      dayIndex: dayIndex ?? undefined,
      time: dayIndex != null ? time.padStart(5, '0') : undefined,
    });
    close();
  };

  return (
    <Sheet visible={visible} title="일정 등록하기 ✏️" onClose={close}>
      <Group>
        <Field label="이름" placeholder="예: 스프카레 가라쿠" value={name} onChangeText={setName} maxLength={40} />
        <Field label="동네" placeholder="예: 스스키노 (선택)" value={area} onChangeText={setArea} maxLength={20} />
        <Field label="링크" placeholder="인스타·지도 링크 (선택)" value={link} onChangeText={setLink} autoCapitalize="none" autoCorrect={false} last />
      </Group>

      <Text style={[t.small, { color: c.sub, marginLeft: 14 }]}>종류</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CATEGORIES.map((k) => <Pill key={k} label={k} emoji={categoryStyle[k].emoji} on={category === k} onPress={() => setCategory(k)} />)}
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 16 }}>
        <TextInput multiline value={memo} onChangeText={setMemo} placeholder="메모 (웨이팅, 가격, 예약 여부 등)" placeholderTextColor={c.faint}
          style={{ fontFamily: G, fontSize: 15, minHeight: 60, color: c.ink, textAlignVertical: 'top', outlineStyle: 'none' } as object} />
      </View>

      <Text style={[t.small, { color: c.sub, marginLeft: 14 }]}>언제 갈까요?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pill label="아직 몰라요" on={dayIndex === null} onPress={() => setDayIndex(null)} />
        {trip.days.map((d, i) => <Pill key={d.date} label={`${i + 1}일 · ${md(d.date)}`} on={dayIndex === i} onPress={() => setDayIndex(i)} />)}
      </ScrollView>
      {dayIndex !== null && (
        <Group><Field label="⏰ 시간" value={time} onChangeText={setTime} placeholder="12:00" maxLength={5} last /></Group>
      )}
      <Text style={[t.note, { marginHorizontal: 6 }]}>
        {dayIndex === null ? '모아보기에만 들어가요. 나중에 일정 탭에서 날짜에 넣을 수 있어요.' : `모아보기와 ${dayIndex + 1}일차 일정에 같이 들어가요.`}
      </Text>

      <Button title="등록하기" emoji="📌" disabled={!name.trim() || (dayIndex !== null && !validTime)} onPress={save} />
    </Sheet>
  );
}
