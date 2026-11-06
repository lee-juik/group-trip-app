import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { TransitLegView } from '../components/TransitLegView';
import { useTrip } from '../store';
import { colors, ui } from '../theme';
import { Flight, PlanItem, TransitLeg, TransitMode } from '../types';

const MODES: TransitMode[] = ['JR', '지하철', '버스', '도보', '택시', '렌트카'];
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const dayLabel = (date: string, i: number) => {
  const d = new Date(`${date}T00:00:00`);
  return `${i + 1}일차 ${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})`;
};

function FlightCard({ flight, label }: { flight: Flight; label: string }) {
  return (
    <View style={[ui.card, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
      <Text style={ui.sub}>✈️ {label} · {flight.flightNo}</Text>
      <Text style={ui.h2}>
        {flight.from} {flight.depart} → {flight.to} {flight.arrive}
      </Text>
    </View>
  );
}

function FlightForm({ onSave, onCancel }: { onSave: (f: Flight) => void; onCancel: () => void }) {
  const [f, setF] = useState<Flight>({ flightNo: '', from: '', to: '', depart: '', arrive: '' });
  const field = (k: keyof Flight, ph: string) => (
    <TextInput style={[ui.input, { flex: 1 }]} placeholder={ph} placeholderTextColor={colors.sub} value={f[k]} onChangeText={(v) => setF({ ...f, [k]: v })} />
  );
  return (
    <View style={ui.card}>
      <Text style={ui.h2}>항공편 입력</Text>
      <Text style={ui.sub}>항공권 사진에서 자동으로 읽어오는 기능은 다음 단계에서 붙일 예정이에요.</Text>
      {field('flightNo', '편명 (예: KE765)')}
      <View style={ui.row}>{field('from', '출발 공항')}{field('depart', '출발 09:00')}</View>
      <View style={ui.row}>{field('to', '도착 공항')}{field('arrive', '도착 12:10')}</View>
      <View style={ui.row}>
        <Button title="취소" ghost style={{ flex: 1 }} onPress={onCancel} />
        <Button title="저장" style={{ flex: 1 }} disabled={!f.flightNo || !f.depart || !f.arrive} onPress={() => onSave(f)} />
      </View>
    </View>
  );
}

function TransitForm({ initial, prevTitle, item, onSave, onRemove, onCancel }: {
  initial?: TransitLeg; prevTitle: string; item: PlanItem;
  onSave: (l: TransitLeg) => void; onRemove: () => void; onCancel: () => void;
}) {
  const [l, setL] = useState<TransitLeg>(initial ?? { mode: '지하철', depart: '', arrive: '', fromStop: prevTitle, toStop: item.title });
  const field = (k: 'line' | 'depart' | 'arrive' | 'fromStop' | 'toStop' | 'note', ph: string) => (
    <TextInput style={[ui.input, { flex: 1 }]} placeholder={ph} placeholderTextColor={colors.sub} value={l[k] ?? ''} onChangeText={(v) => setL({ ...l, [k]: v })} />
  );
  return (
    <View style={[ui.card, { marginLeft: 22, borderColor: colors.primary }]}>
      <Text style={ui.h2}>이동 방법</Text>
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        {MODES.map((m) => <Chip key={m} label={m} on={l.mode === m} onPress={() => setL({ ...l, mode: m })} />)}
      </View>
      {field('line', '노선 (예: 난보쿠선, 쾌속 에어포트)')}
      <View style={ui.row}>{field('fromStop', '타는 곳')}{field('depart', '출발 14:10')}</View>
      <View style={ui.row}>{field('toStop', '내리는 곳')}{field('arrive', '도착 14:14')}</View>
      {field('note', '메모 (예: 15분 간격)')}
      <View style={ui.row}>
        {initial && <Button title="삭제" ghost style={{ flex: 1 }} onPress={onRemove} />}
        <Button title="취소" ghost style={{ flex: 1 }} onPress={onCancel} />
        <Button title="저장" style={{ flex: 1 }} disabled={!l.depart || !l.arrive} onPress={() => onSave(l)} />
      </View>
    </View>
  );
}

export function PlanScreen() {
  const { state, dispatch } = useTrip();
  const { trip } = state;
  const [dayIndex, setDayIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [time, setTime] = useState('12:00');
  const [editingLeg, setEditingLeg] = useState<string | null>(null);
  const [flightForm, setFlightForm] = useState<'outbound' | 'inbound' | null>(null);

  const day = trip.days[dayIndex];
  const isFirst = dayIndex === 0;
  const isLast = dayIndex === trip.days.length - 1;
  const scheduled = new Set(trip.days.flatMap((d) => d.items.map((i) => i.placeId)).filter(Boolean));
  const candidates = trip.places
    .filter((p) => p.category !== '숙소' && p.category !== '교통' && !scheduled.has(p.id))
    .sort((a, b) => b.wantedBy.length - a.wantedBy.length);

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.pad}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {trip.days.map((d, i) => (
          <Chip key={d.date} label={dayLabel(d.date, i)} on={i === dayIndex} onPress={() => { setDayIndex(i); setAdding(false); setEditingLeg(null); }} />
        ))}
      </ScrollView>

      {isFirst && (day.outbound ? <FlightCard flight={day.outbound} label="가는 편" /> : flightForm !== 'outbound' && <Button title="+ 가는 항공편 넣기" ghost onPress={() => setFlightForm('outbound')} />)}
      {flightForm && (
        <FlightForm
          onCancel={() => setFlightForm(null)}
          onSave={(f) => { dispatch({ type: 'setFlight', dayIndex, direction: flightForm, flight: f }); setFlightForm(null); }}
        />
      )}

      {day.items.length === 0 && <Text style={ui.sub}>아직 비어 있어요. 수집함에서 가고 싶은 곳을 넣어보세요.</Text>}

      <View>
        {day.items.map((it, idx) => {
          const prev = day.items[idx - 1];
          return (
            <View key={it.id}>
              {idx > 0 &&
                (editingLeg === it.id ? (
                  <TransitForm
                    initial={it.transitIn}
                    prevTitle={prev.title}
                    item={it}
                    onCancel={() => setEditingLeg(null)}
                    onRemove={() => { dispatch({ type: 'setTransit', dayIndex, itemId: it.id, leg: undefined }); setEditingLeg(null); }}
                    onSave={(leg) => { dispatch({ type: 'setTransit', dayIndex, itemId: it.id, leg }); setEditingLeg(null); }}
                  />
                ) : it.transitIn ? (
                  <TransitLegView leg={it.transitIn} city={trip.city} onEdit={() => setEditingLeg(it.id)} />
                ) : (
                  <Pressable onPress={() => setEditingLeg(it.id)} style={{ marginLeft: 38, paddingVertical: 8 }}>
                    <Text style={[ui.sub, { color: colors.primary }]}>+ 이동 방법·시간표 넣기</Text>
                  </Pressable>
                ))}
              <View style={[ui.card, ui.row]}>
                <Text style={[ui.h2, { width: 52 }]}>{it.time}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ui.body}>{it.title}</Text>
                  {it.placeId && <Text style={ui.sub}>{trip.places.find((p) => p.id === it.placeId)?.area}</Text>}
                </View>
                <Text style={ui.sub} onPress={() => dispatch({ type: 'removePlanItem', dayIndex, itemId: it.id })}>삭제</Text>
              </View>
            </View>
          );
        })}
      </View>

      {!adding ? (
        <Button title="+ 일정 추가" onPress={() => setAdding(true)} />
      ) : (
        <View style={ui.card}>
          <Text style={ui.h2}>수집함에서 고르기</Text>
          <View style={ui.row}>
            <Text style={ui.body}>시간</Text>
            <TextInput style={[ui.input, { width: 80, textAlign: 'center' }]} value={time} onChangeText={setTime} />
          </View>
          {candidates.length === 0 && <Text style={ui.sub}>남은 후보가 없어요.</Text>}
          {candidates.map((p) => (
            <Pressable
              key={p.id}
              style={ui.input}
              onPress={() => { dispatch({ type: 'addPlanItem', dayIndex, time, title: p.name, placeId: p.id }); setAdding(false); }}
            >
              <Text style={ui.body}>{p.name}</Text>
              <Text style={ui.sub}>{p.category} · {p.wantedBy.length}명이 원함</Text>
            </Pressable>
          ))}
          <Button title="닫기" ghost onPress={() => setAdding(false)} />
        </View>
      )}

      {isLast && (day.inbound ? <FlightCard flight={day.inbound} label="오는 편" /> : flightForm !== 'inbound' && <Button title="+ 오는 항공편 넣기" ghost onPress={() => setFlightForm('inbound')} />)}
    </ScrollView>
  );
}
