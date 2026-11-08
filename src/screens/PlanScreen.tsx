import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, LinearTransition } from 'react-native-reanimated';
import { BoardingPass } from '../components/BoardingPass';
import { Button } from '../components/Button';
import { Field, Group } from '../components/Field';
import { success } from '../components/haptics';
import { LargeHeaderScreen } from '../components/LargeHeaderScreen';
import { MeButton } from '../components/MeButton';
import { Pill } from '../components/Pill';
import { PressableScale } from '../components/PressableScale';
import { Segmented } from '../components/Segmented';
import { Sheet } from '../components/Sheet';
import { TransitLegView } from '../components/TransitLegView';
import { useTrip } from '../store';
import { c, categoryStyle, font, shadow, transitStyle } from '../theme';
import { Flight, TransitLeg, TransitMode } from '../types';

const MODES: TransitMode[] = ['JR', '지하철', '버스', '도보', '택시', '렌트카'];
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const short = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()} ${WEEK[d.getDay()]}`;
};

type SheetState =
  | { kind: 'add' }
  | { kind: 'leg'; itemId: string; initial: TransitLeg }
  | { kind: 'flight'; direction: 'outbound' | 'inbound' }
  | null;

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
    const l = initial ?? { mode: '지하철' as TransitMode, depart: '', arrive: '', fromStop: prevTitle, toStop: title };
    setLeg(l);
    setSheet({ kind: 'leg', itemId, initial: l });
  };
  const close = () => setSheet(null);

  return (
    <>
      <LargeHeaderScreen title="일정" right={<MeButton />}>
        <Segmented
          options={trip.days.map((d, i) => ({ label: `${i + 1}일차`, sub: short(d.date) }))}
          index={dayIndex}
          onChange={setDayIndex}
        />

        <Animated.View key={day.date} entering={FadeInRight.springify().damping(20)} style={{ gap: 14 }}>
          {isFirst && (day.outbound
            ? <BoardingPass flight={day.outbound} label="가는 편" />
            : <Button title="가는 항공편 넣기" icon="airplane" kind="tinted" onPress={() => setSheet({ kind: 'flight', direction: 'outbound' })} />)}

          {day.items.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
              <Ionicons name="map-outline" size={40} color={c.label3} />
              <Text style={font.footnote}>아직 비어 있어요. 가고 싶은 곳을 넣어보세요.</Text>
            </View>
          )}

          <View>
            {day.items.map((it, idx) => {
              const prev = day.items[idx - 1];
              const place = trip.places.find((p) => p.id === it.placeId);
              const cs = place ? categoryStyle[place.category] : { icon: 'flag', color: c.label2 };
              const lastItem = idx === day.items.length - 1;
              return (
                <Animated.View key={it.id} entering={FadeInDown.delay(idx * 70).springify().damping(18)} layout={LinearTransition.springify().damping(18)}>
                  {idx > 0 && (
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ width: 52, alignItems: 'center' }}>
                        <View style={{ width: 2, flex: 1, backgroundColor: it.transitIn ? transitStyle[it.transitIn.mode].color : c.sep, opacity: it.transitIn ? 0.5 : 1 }} />
                      </View>
                      <View style={{ flex: 1, paddingVertical: 8 }}>
                        {it.transitIn ? (
                          <TransitLegView leg={it.transitIn} city={trip.city} onEdit={() => openLeg(it.id, prev.title, it.title, it.transitIn)} />
                        ) : (
                          <PressableScale onPress={() => openLeg(it.id, prev.title, it.title)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
                            <Ionicons name="add-circle" size={18} color={c.blue} />
                            <Text style={[font.footnote, { color: c.blue, fontWeight: '600' }]}>이동 방법·시간표 넣기</Text>
                          </PressableScale>
                        )}
                      </View>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 52, alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: cs.color, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.bg }}>
                        <Ionicons name={cs.icon as any} size={14} color="#fff" />
                      </View>
                    </View>
                    <View style={[{ flex: 1, backgroundColor: c.card, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, shadow]}>
                      <Text style={[font.headline, { fontVariant: ['tabular-nums'], color: cs.color }]}>{it.time}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={font.callout}>{it.title}</Text>
                        {place?.area ? <Text style={font.caption}>{place.area}</Text> : null}
                      </View>
                      <PressableScale onPress={() => dispatch({ type: 'removePlanItem', dayIndex, itemId: it.id })} hitSlop={8}>
                        <Ionicons name="close-circle" size={20} color={c.label3} />
                      </PressableScale>
                    </View>
                  </View>
                  {lastItem && <View style={{ height: 4 }} />}
                </Animated.View>
              );
            })}
          </View>

          <Button title="일정 추가" icon="add" onPress={() => setSheet({ kind: 'add' })} />

          {isLast && (day.inbound
            ? <BoardingPass flight={day.inbound} label="오는 편" />
            : <Button title="오는 항공편 넣기" icon="airplane" kind="tinted" onPress={() => setSheet({ kind: 'flight', direction: 'inbound' })} />)}
        </Animated.View>
      </LargeHeaderScreen>

      <Sheet visible={sheet?.kind === 'add'} title={`${dayIndex + 1}일차에 추가`} onClose={close}>
        <Group>
          <Field label="시간" value={time} onChangeText={setTime} placeholder="12:00" last />
        </Group>
        <Group label="수집함 후보 (원하는 사람 많은 순)">
          {candidates.length === 0 && <Text style={[font.footnote, { padding: 14 }]}>남은 후보가 없어요.</Text>}
          {candidates.map((p, i) => {
            const cs = categoryStyle[p.category];
            return (
              <PressableScale key={p.id} scaleTo={0.98}
                onPress={() => { success(); dispatch({ type: 'addPlanItem', dayIndex, time, title: p.name, placeId: p.id }); close(); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 0.5 : 0, borderColor: c.sep }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: `${cs.color}22`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={cs.icon as any} size={17} color={cs.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={font.callout}>{p.name}</Text>
                  <Text style={font.caption}>{p.category} · ♥ {p.wantedBy.length}명</Text>
                </View>
                <Ionicons name="add-circle" size={24} color={c.blue} />
              </PressableScale>
            );
          })}
        </Group>
      </Sheet>

      <Sheet visible={sheet?.kind === 'leg'} title="이동 방법" onClose={close}>
        {leg && sheet?.kind === 'leg' && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MODES.map((m) => (
                <Pill key={m} label={m} icon={transitStyle[m].icon} color={transitStyle[m].color} on={leg.mode === m} onPress={() => setLeg({ ...leg, mode: m })} />
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
            <Button title="저장" disabled={!leg.depart || !leg.arrive}
              onPress={() => { success(); dispatch({ type: 'setTransit', dayIndex, itemId: sheet.itemId, leg }); close(); }} />
            <Button title="이동 칸 지우기" kind="plain" color={c.red}
              onPress={() => { dispatch({ type: 'setTransit', dayIndex, itemId: sheet.itemId, leg: undefined }); close(); }} />
          </>
        )}
      </Sheet>

      <Sheet visible={sheet?.kind === 'flight'} title="항공편" onClose={close}>
        <Text style={font.footnote}>항공권 사진에서 자동으로 읽어오는 기능은 다음 단계에서 붙일 예정이에요.</Text>
        <Group>
          <Field label="편명" placeholder="KE765" value={flight.flightNo} onChangeText={(v) => setFlight({ ...flight, flightNo: v })} />
          <Field label="출발 공항" placeholder="인천" value={flight.from} onChangeText={(v) => setFlight({ ...flight, from: v })} />
          <Field label="출발 시간" placeholder="09:00" value={flight.depart} onChangeText={(v) => setFlight({ ...flight, depart: v })} />
          <Field label="도착 공항" placeholder="신치토세" value={flight.to} onChangeText={(v) => setFlight({ ...flight, to: v })} />
          <Field label="도착 시간" placeholder="12:10" value={flight.arrive} onChangeText={(v) => setFlight({ ...flight, arrive: v })} last />
        </Group>
        <Button title="저장" disabled={!flight.flightNo || !flight.depart || !flight.arrive}
          onPress={() => { if (sheet?.kind === 'flight') { success(); dispatch({ type: 'setFlight', dayIndex, direction: sheet.direction, flight }); } close(); }} />
      </Sheet>
    </>
  );
}
