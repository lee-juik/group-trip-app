import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, LinearTransition } from 'react-native-reanimated';
import { BoardingPass } from '../components/BoardingPass';
import { Button } from '../components/Button';
import { DayTabs } from '../components/DayTabs';
import { Field, Group } from '../components/Field';
import { success } from '../components/haptics';
import { LargeHeaderScreen } from '../components/LargeHeaderScreen';
import { MeButton } from '../components/MeButton';
import { Pill } from '../components/Pill';
import { PressableScale } from '../components/PressableScale';
import { Sheet } from '../components/Sheet';
import { TransitLegView } from '../components/TransitLegView';
import { useTrip } from '../store';
import { c, categoryStyle, J, softShadow, t, transitStyle } from '../theme';
import { Flight, TransitLeg, TransitMode } from '../types';

const MODES: TransitMode[] = ['JR', '지하철', '버스', '도보', '택시', '렌트카'];
const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const DOT_COLORS = ['#FFE4D6', '#E8DEFF', '#FFF1C2', '#DCEBFF', '#DDF5E8'];

type SheetState = { kind: 'add' } | { kind: 'leg'; itemId: string } | { kind: 'flight'; direction: 'outbound' | 'inbound' } | null;

export function PlanScreen() {
  const { state, dispatch } = useTrip();
  const { trip } = state;
  const [dayIndex, setDayIndex] = useState(0);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [time, setTime] = useState('12:00');
  const [leg, setLeg] = useState<TransitLeg | null>(null);
  const [flight, setFlight] = useState<Flight>({ flightNo: '', from: '', to: '', depart: '', arrive: '' });

  const day = trip.days[dayIndex];
  const isFirst = dayIndex === 0;
  const isLast = dayIndex === trip.days.length - 1;
  const scheduled = new Set(trip.days.flatMap((d) => d.items.map((i) => i.placeId)).filter(Boolean));
  const candidates = trip.places
    .filter((p) => p.category !== '숙소' && p.category !== '교통' && !scheduled.has(p.id))
    .sort((a, b) => b.wantedBy.length - a.wantedBy.length);

  const openLeg = (itemId: string, prevTitle: string, title: string, initial?: TransitLeg) => {
    setLeg(initial ?? { mode: '지하철', depart: '', arrive: '', fromStop: prevTitle, toStop: title });
    setSheet({ kind: 'leg', itemId });
  };
  const close = () => setSheet(null);

  return (
    <>
      <LargeHeaderScreen greeting={`${trip.days.length - 1}박 ${trip.days.length}일`} title="우리의 일정 📅" compactTitle="일정" right={<MeButton />}>
        <DayTabs options={trip.days.map((d, i) => `${i + 1}일 · ${md(d.date)}`)} index={dayIndex} onChange={setDayIndex} />

        <Animated.View key={day.date} entering={FadeInRight.springify().damping(18)} style={{ gap: 14 }}>
          {isFirst && (day.outbound
            ? <BoardingPass flight={day.outbound} label="가는 편" />
            : <Button title="가는 비행기 넣기" emoji="✈️" kind="soft" onPress={() => setSheet({ kind: 'flight', direction: 'outbound' })} />)}

          {day.items.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 6 }}>
              <Text style={{ fontSize: 44 }}>🗺️</Text>
              <Text style={t.note}>아직 비어 있어요. 가고 싶은 곳을 넣어볼까요?</Text>
            </View>
          )}

          <View>
            {day.items.map((it, idx) => {
              const prev = day.items[idx - 1];
              const place = trip.places.find((p) => p.id === it.placeId);
              const emoji = place?.emoji ?? (place ? categoryStyle[place.category].emoji : idx === 0 && isFirst ? '🛬' : '📍');
              const dot = place ? categoryStyle[place.category].bg : DOT_COLORS[idx % DOT_COLORS.length];
              const last = idx === day.items.length - 1;
              return (
                <Animated.View key={it.id} entering={FadeInDown.delay(idx * 70).springify().damping(16)} layout={LinearTransition.springify().damping(16)}
                  style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 46, alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: dot, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </View>
                    {!last && <View style={{ flex: 1, width: 0, borderLeftWidth: 3, borderStyle: 'dotted', borderColor: '#D5CDEB', marginVertical: 4 }} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: last ? 0 : 6, gap: 8 }}>
                    <View style={[{ backgroundColor: '#fff', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }, softShadow]}>
                      <View style={{ flex: 1 }}>
                        <Text style={t.small}>{it.time}{place?.area ? ` · ${place.area}` : ''}</Text>
                        <Text style={t.h}>{it.title}{place && place.wantedBy.length >= 3 ? <Text style={{ color: c.pink, fontSize: 14 }}>  ♥{place.wantedBy.length}</Text> : null}</Text>
                      </View>
                      <PressableScale onPress={() => dispatch({ type: 'removePlanItem', dayIndex, itemId: it.id })} hitSlop={8}
                        style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#F4F1FA', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: J, fontSize: 11, color: c.faint }}>✕</Text>
                      </PressableScale>
                    </View>
                    {!last && (() => {
                      const next = day.items[idx + 1];
                      return next.transitIn ? (
                        <TransitLegView leg={next.transitIn} city={trip.city} onEdit={() => openLeg(next.id, it.title, next.title, next.transitIn)} />
                      ) : (
                        <PressableScale onPress={() => openLeg(next.id, it.title, next.title)} style={{ alignSelf: 'flex-start', borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D5CDEB', paddingVertical: 7, paddingHorizontal: 12 }}>
                          <Text style={{ fontFamily: J, fontSize: 13, color: c.sub }}>＋ 어떻게 이동할까요?</Text>
                        </PressableScale>
                      );
                    })()}
                  </View>
                </Animated.View>
              );
            })}
          </View>

          <Button title="일정 추가하기" emoji="➕" onPress={() => setSheet({ kind: 'add' })} />

          {isLast && (day.inbound
            ? <BoardingPass flight={day.inbound} label="오는 편" />
            : <Button title="오는 비행기 넣기" emoji="✈️" kind="soft" onPress={() => setSheet({ kind: 'flight', direction: 'inbound' })} />)}
        </Animated.View>
      </LargeHeaderScreen>

      <Sheet visible={sheet?.kind === 'add'} title={`${dayIndex + 1}일차에 넣기`} onClose={close}>
        <Group><Field label="⏰ 시간" value={time} onChangeText={setTime} placeholder="12:00" last /></Group>
        <Group label="수집함 후보 (가고 싶은 사람 많은 순)">
          {candidates.length === 0 && <Text style={[t.note, { padding: 16 }]}>남은 후보가 없어요.</Text>}
          {candidates.map((p, i) => (
            <PressableScale key={p.id} scaleTo={0.98}
              onPress={() => { success(); dispatch({ type: 'addPlanItem', dayIndex, time, title: p.name, placeId: p.id }); close(); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1.5 : 0, borderColor: c.line }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: categoryStyle[p.category].bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{p.emoji ?? categoryStyle[p.category].emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={t.label}>{p.name}</Text>
                <Text style={[t.note, { fontSize: 12 }]}>{p.category} · ♥ {p.wantedBy.length}명</Text>
              </View>
              <Text style={{ fontFamily: J, fontSize: 22, color: c.ink }}>＋</Text>
            </PressableScale>
          ))}
        </Group>
      </Sheet>

      <Sheet visible={sheet?.kind === 'leg'} title="어떻게 갈까요? 🚃" onClose={close}>
        {leg && sheet?.kind === 'leg' && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MODES.map((m) => (
                <Pill key={m} label={m} emoji={transitStyle[m].emoji} on={leg.mode === m} onBg={transitStyle[m].bg} onFg={transitStyle[m].fg} onPress={() => setLeg({ ...leg, mode: m })} />
              ))}
            </View>
            <Group>
              <Field label="노선" placeholder="난보쿠선, 쾌속 에어포트" value={leg.line ?? ''} onChangeText={(v) => setLeg({ ...leg, line: v })} />
              <Field label="타는 곳" value={leg.fromStop} onChangeText={(v) => setLeg({ ...leg, fromStop: v })} />
              <Field label="출발" placeholder="14:10" value={leg.depart} onChangeText={(v) => setLeg({ ...leg, depart: v })} />
              <Field label="내리는 곳" value={leg.toStop} onChangeText={(v) => setLeg({ ...leg, toStop: v })} />
              <Field label="도착" placeholder="14:14" value={leg.arrive} onChangeText={(v) => setLeg({ ...leg, arrive: v })} />
              <Field label="메모" placeholder="15분 간격" value={leg.note ?? ''} onChangeText={(v) => setLeg({ ...leg, note: v })} last />
            </Group>
            <Button title="저장" emoji="💾" disabled={!leg.depart || !leg.arrive}
              onPress={() => { success(); dispatch({ type: 'setTransit', dayIndex, itemId: sheet.itemId, leg }); close(); }} />
            <Button title="이동 칸 지우기" kind="plain" fg={c.pink}
              onPress={() => { dispatch({ type: 'setTransit', dayIndex, itemId: sheet.itemId, leg: undefined }); close(); }} />
          </>
        )}
      </Sheet>

      <Sheet visible={sheet?.kind === 'flight'} title="비행기 정보 ✈️" onClose={close}>
        <Text style={t.note}>항공권 사진을 올리면 자동으로 읽어오는 기능은 다음 단계에서 붙일게요.</Text>
        <Group>
          <Field label="편명" placeholder="KE765" value={flight.flightNo} onChangeText={(v) => setFlight({ ...flight, flightNo: v })} />
          <Field label="출발 공항" placeholder="인천" value={flight.from} onChangeText={(v) => setFlight({ ...flight, from: v })} />
          <Field label="출발 시간" placeholder="09:00" value={flight.depart} onChangeText={(v) => setFlight({ ...flight, depart: v })} />
          <Field label="도착 공항" placeholder="신치토세" value={flight.to} onChangeText={(v) => setFlight({ ...flight, to: v })} />
          <Field label="도착 시간" placeholder="12:10" value={flight.arrive} onChangeText={(v) => setFlight({ ...flight, arrive: v })} last />
        </Group>
        <Button title="저장" emoji="💾" disabled={!flight.flightNo || !flight.depart || !flight.arrive}
          onPress={() => { if (sheet?.kind === 'flight') { success(); dispatch({ type: 'setFlight', dayIndex, direction: sheet.direction, flight }); } close(); }} />
      </Sheet>
    </>
  );
}
