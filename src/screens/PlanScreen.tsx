import { useState } from 'react';
import { Linking, Text, TextInput, View } from 'react-native';
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
import { mapsRoute, optimizeDay, planNewStops, Reorder } from '../lib/route';
import { confirmAsync, mapsUrl, normTime, todayIndex } from '../lib/util';
import { useTrip } from '../store';
import { c, categoryStyle, G, J, softShadow, t, transitStyle } from '../theme';
import { Flight, PlanItem, TransitLeg, TransitMode } from '../types';

const MODES: TransitMode[] = ['JR', '지하철', '버스', '도보', '택시', '렌트카'];
const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const DOT_COLORS = ['#FFE4D6', '#E8DEFF', '#FFF1C2', '#DCEBFF', '#DDF5E8'];
const EMPTY_FLIGHT: Flight = { flightNo: '', from: '', to: '', depart: '', arrive: '' };
const TIME_HINT = '12:00, 1230, 12시30분처럼 적어주세요';

type SheetState =
  | { kind: 'route'; r: Reorder }
  | { kind: 'add' }
  | { kind: 'edit'; itemId: string }
  | { kind: 'leg'; itemId: string }
  | { kind: 'flight'; direction: 'outbound' | 'inbound' }
  | null;

export function PlanScreen() {
  const { state, dispatch } = useTrip();
  const { trip } = state;
  // 여행 중이면 오늘 날짜 탭을 먼저 보여준다
  const [dayIndexRaw, setDayIndex] = useState(() => Math.max(0, Math.min(todayIndex(trip.days), trip.days.length - 1)));
  const dayIndex = Math.min(dayIndexRaw, Math.max(0, trip.days.length - 1));
  const [sheet, setSheet] = useState<SheetState>(null);
  const [time, setTime] = useState('12:00');
  const [freeTitle, setFreeTitle] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [edit, setEdit] = useState({ time: '', title: '', note: '' });
  const [leg, setLeg] = useState<TransitLeg | null>(null);
  const [flight, setFlight] = useState<Flight>(EMPTY_FLIGHT);

  const day = trip.days[dayIndex];
  const isFirst = dayIndex === 0;
  const isLast = dayIndex === trip.days.length - 1;

  // 장소별로 어느 날 일정에 들어가 있는지
  const scheduledIn = new Map<string, number[]>();
  trip.days.forEach((d, i) => d.items.forEach((it) => { if (it.placeId) scheduledIn.set(it.placeId, [...(scheduledIn.get(it.placeId) ?? []), i + 1]); }));
  const candidates = trip.places
    .filter((p) => p.category !== '교통')
    .sort((a, b) => Number(scheduledIn.has(a.id)) - Number(scheduledIn.has(b.id)) || b.wantedBy.length - a.wantedBy.length);

  const close = () => { setSheet(null); setPicked([]); setFreeTitle(''); };
  const route = day ? mapsRoute(trip, day) : undefined;
  const togglePick = (id: string) => setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const addTime = normTime(time);
  const free = freeTitle.trim();

  const addPicked = () => {
    if (!addTime) return;
    const ps = picked.map((id) => trip.places.find((p) => p.id === id)!).filter(Boolean);
    const items: { time: string; title: string; placeId?: string }[] =
      ps.length > 1 ? planNewStops(trip, dayIndex, ps, addTime) : ps.map((p) => ({ time: addTime, title: p.name, placeId: p.id }));
    if (free) items.push({ time: addTime, title: free });
    if (items.length === 1) dispatch({ type: 'addPlanItem', dayIndex, ...items[0] });
    else if (items.length > 1) dispatch({ type: 'addPlanItems', dayIndex, items });
    success(); close();
  };

  const openEdit = (it: PlanItem) => { setEdit({ time: it.time, title: it.title, note: it.note ?? '' }); setSheet({ kind: 'edit', itemId: it.id }); };
  const editTime = normTime(edit.time);
  const saveEdit = () => {
    if (sheet?.kind !== 'edit' || !editTime || !edit.title.trim()) return;
    dispatch({ type: 'updatePlanItem', dayIndex, itemId: sheet.itemId, patch: { time: editTime, title: edit.title.trim(), note: edit.note.trim() } });
    success(); close();
  };
  const removeItem = async (it: PlanItem) => {
    if (!(await confirmAsync(`'${it.title}' 일정을 지울까요?`, it.transitIn ? '이동 정보도 같이 지워져요.' : undefined, '지우기', true))) return;
    dispatch({ type: 'removePlanItem', dayIndex, itemId: it.id });
    close();
  };

  const openLeg = (itemId: string, prevTitle: string, title: string, initial?: TransitLeg) => {
    setLeg(initial ?? { mode: '지하철', depart: '', arrive: '', fromStop: prevTitle, toStop: title });
    setSheet({ kind: 'leg', itemId });
  };
  const openFlight = (direction: 'outbound' | 'inbound') => { setFlight(day?.[direction] ?? EMPTY_FLIGHT); setSheet({ kind: 'flight', direction }); };
  const flightOk = !!flight.flightNo.trim() && !!normTime(flight.depart) && !!normTime(flight.arrive);
  const saveFlight = () => {
    if (sheet?.kind !== 'flight' || !flightOk) return;
    dispatch({ type: 'setFlight', dayIndex, direction: sheet.direction, flight: { ...flight, flightNo: flight.flightNo.trim().toUpperCase(), depart: normTime(flight.depart)!, arrive: normTime(flight.arrive)! } });
    success(); close();
  };
  const removeFlight = async () => {
    if (sheet?.kind !== 'flight') return;
    if (!(await confirmAsync('비행기 정보를 지울까요?', undefined, '지우기', true))) return;
    dispatch({ type: 'setFlight', dayIndex, direction: sheet.direction, flight: undefined });
    close();
  };

  if (!day) {
    return (
      <LargeHeaderScreen title="우리의 일정 🗺️" compactTitle="일정" right={<MeButton />}>
        <Text style={[t.note, { textAlign: 'center', paddingVertical: 30 }]}>여행 날짜가 아직 없어요.</Text>
      </LargeHeaderScreen>
    );
  }

  const editItem = sheet?.kind === 'edit' ? day.items.find((x) => x.id === sheet.itemId) : undefined;
  const editPlace = editItem?.placeId ? trip.places.find((p) => p.id === editItem.placeId) : undefined;
  const nights = trip.days.length - 1;

  return (
    <>
      <LargeHeaderScreen greeting={nights > 0 ? `${nights}박 ${trip.days.length}일` : '당일 여행'} title="우리의 일정 🗺️" compactTitle="일정" right={<MeButton />}>
        <DayTabs options={trip.days.map((d, i) => `${i + 1}일 · ${md(d.date)}`)} index={dayIndex} onChange={setDayIndex} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="동선 정리" emoji="🧭" kind="soft" style={{ flex: 1, paddingVertical: 11 }} disabled={day.items.length < 2}
            onPress={() => setSheet({ kind: 'route', r: optimizeDay(trip, dayIndex) })} />
          <Button title="지도로 보기" emoji="🗺" kind="soft" style={{ flex: 1, paddingVertical: 11 }} disabled={!route}
            onPress={() => route && Linking.openURL(route)} />
        </View>
        {!route && day.items.length >= 2 && <Text style={[t.note, { marginTop: -6, marginHorizontal: 6, fontSize: 12 }]}>지도로 보려면 카드에 구글맵 주소(지도 위치)가 2곳 이상 있어야 해요.</Text>}

        <Animated.View key={day.date} entering={FadeInRight.springify().damping(18)} style={{ gap: 14 }}>
          {isFirst && (day.outbound
            ? <BoardingPass flight={day.outbound} label="가는 편" onPress={() => openFlight('outbound')} />
            : <Button title="가는 비행기 넣기" emoji="✈️" kind="soft" onPress={() => openFlight('outbound')} />)}

          {day.items.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 6 }}>
              <Text style={{ fontSize: 44 }}>🗺️</Text>
              <Text style={t.note}>아직 비어 있어요. 가고 싶은 곳을 넣어볼까요?</Text>
            </View>
          )}

          <View>
            {day.items.map((it, idx) => {
              const place = trip.places.find((p) => p.id === it.placeId);
              const emoji = place?.emoji ?? (place ? categoryStyle[place.category].emoji : idx === 0 && isFirst ? '🛬' : '📍');
              const dot = place ? categoryStyle[place.category].bg : DOT_COLORS[idx % DOT_COLORS.length];
              const last = idx === day.items.length - 1;
              return (
                <Animated.View key={it.id} entering={FadeInDown.delay(Math.min(idx, 8) * 70).springify().damping(16)} layout={LinearTransition.springify().damping(16)}
                  style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 46, alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: dot, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </View>
                    {!last && <View style={{ flex: 1, width: 0, borderLeftWidth: 3, borderStyle: 'dotted', borderColor: '#D5CDEB', marginVertical: 4 }} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: last ? 0 : 6, gap: 8 }}>
                    <PressableScale scaleTo={0.98} onPress={() => openEdit(it)}
                      style={[{ backgroundColor: '#fff', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }, softShadow]}>
                      <View style={{ flex: 1 }}>
                        <Text style={t.small}>{it.time}{place?.area ? ` · ${place.area}` : ''}</Text>
                        <Text style={t.h}>{it.title}{place && place.wantedBy.length >= 3 ? <Text style={{ color: c.pink, fontSize: 14 }}>  ♥{place.wantedBy.length}</Text> : null}</Text>
                        {!!it.note && <Text style={[t.note, { marginTop: 2 }]} numberOfLines={2}>📝 {it.note}</Text>}
                      </View>
                      <PressableScale onPress={() => removeItem(it)} hitSlop={6}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F1FA', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: J, fontSize: 14, color: c.sub }}>✕</Text>
                      </PressableScale>
                    </PressableScale>
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
            ? <BoardingPass flight={day.inbound} label="오는 편" onPress={() => openFlight('inbound')} />
            : <Button title="오는 비행기 넣기" emoji="✈️" kind="soft" onPress={() => openFlight('inbound')} />)}
          {day.items.length > 0 && <Text style={[t.note, { textAlign: 'center', fontSize: 12 }]}>일정을 누르면 시간·이름·메모를 고칠 수 있어요</Text>}
        </Animated.View>
      </LargeHeaderScreen>

      {/* 일정 추가 */}
      <Sheet visible={sheet?.kind === 'add'} title={`${dayIndex + 1}일차에 넣기`} onClose={close}>
        <Group>
          <Field label="⏰ 시작" value={time} onChangeText={setTime} placeholder="12:00 또는 1230" keyboardType="numbers-and-punctuation" maxLength={7} />
          <Field label="✍️ 직접" value={freeTitle} onChangeText={setFreeTitle} placeholder="호텔 체크인, 공항 도착처럼 직접 적기" maxLength={40} last />
        </Group>
        <Text style={[t.note, { marginHorizontal: 6, marginTop: -6, color: addTime ? c.sub : c.orange }]}>
          {addTime ? '여러 곳을 고르면 숙소에서 가까운 순서로 동선을 짜서 시간까지 넣어줘요.' : TIME_HINT}
        </Text>
        <Group label="모아보기 후보 (가고 싶은 사람 많은 순)">
          {candidates.length === 0 && <Text style={[t.note, { padding: 16 }]}>모아보기에 카드가 아직 없어요.</Text>}
          {candidates.map((p, i) => {
            const on = picked.includes(p.id);
            const where = scheduledIn.get(p.id);
            return (
              <PressableScale key={p.id} scaleTo={0.98} onPress={() => togglePick(p.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1.5 : 0, borderColor: c.line, backgroundColor: on ? c.pinkSoft : 'transparent', opacity: where && !on ? 0.6 : 1 }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: categoryStyle[p.category].bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>{p.emoji ?? categoryStyle[p.category].emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={t.label}>{p.name}</Text>
                  <Text style={[t.note, { fontSize: 12 }]}>{p.category} · ♥ {p.wantedBy.length}명{where ? ` · 이미 ${where.map((d) => `${d}일차`).join(', ')}에 있음` : ''}</Text>
                </View>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: on ? c.pink : '#F4F1FA', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: J, fontSize: 14, color: on ? '#fff' : c.faint }}>{on ? String(picked.indexOf(p.id) + 1) : '＋'}</Text>
                </View>
              </PressableScale>
            );
          })}
        </Group>
        <Button
          title={picked.length > 1 ? `${picked.length}곳 동선대로 넣기${free ? ' + 직접 쓴 것' : ''}` : picked.length === 1 || free ? '일정에 넣기' : '갈 곳을 고르거나 직접 적어주세요'}
          emoji={picked.length > 1 ? '🧭' : '📌'} disabled={(!picked.length && !free) || !addTime} onPress={addPicked} />
      </Sheet>

      {/* 일정 고치기 */}
      <Sheet visible={sheet?.kind === 'edit'} title="일정 고치기 ✏️" onClose={close}>
        <Group>
          <Field label="⏰ 시간" value={edit.time} onChangeText={(v) => setEdit({ ...edit, time: v })} placeholder="12:00" keyboardType="numbers-and-punctuation" maxLength={7} />
          <Field label="이름" value={edit.title} onChangeText={(v) => setEdit({ ...edit, title: v })} maxLength={40} last />
        </Group>
        {!editTime && <Text style={[t.note, { marginHorizontal: 6, marginTop: -6, color: c.orange }]}>{TIME_HINT}</Text>}
        <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 16 }}>
          <TextInput multiline value={edit.note} onChangeText={(v) => setEdit({ ...edit, note: v })} placeholder="메모 (예약번호, 집합 장소, 주의할 점)" placeholderTextColor={c.faint} maxLength={300}
            style={{ fontFamily: G, fontSize: 15, minHeight: 60, color: c.ink, textAlignVertical: 'top', outlineStyle: 'none' } as object} />
        </View>
        {editPlace && <Text style={[t.note, { marginHorizontal: 6 }]}>모아보기의 '{editPlace.name}' 카드와 연결돼 있어요. 카드 메모는 모아보기에서 고쳐요.</Text>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="구글맵에서 열기" emoji="🗺" kind="soft" style={{ flex: 1, paddingVertical: 12 }}
            onPress={() => Linking.openURL(mapsUrl(editPlace ?? { name: edit.title }, trip.city)).catch(() => {})} />
          <Button title="지우기" emoji="🗑" kind="soft" fg={c.pink} style={{ flex: 1, paddingVertical: 12 }} onPress={() => editItem && removeItem(editItem)} />
        </View>
        <Button title="저장" emoji="💾" disabled={!editTime || !edit.title.trim()} onPress={saveEdit} />
      </Sheet>

      {/* 동선 정리 */}
      <Sheet visible={sheet?.kind === 'route'} title="동선 정리 🧭" onClose={close}>
        {sheet?.kind === 'route' && (sheet.r.changes.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 6, paddingVertical: 20 }}>
            <Text style={{ fontSize: 40 }}>👍</Text>
            <Text style={t.h}>지금 순서가 이미 제일 가까워요!</Text>
            <Text style={t.note}>{sheet.r.before > 0 ? `하루 이동 거리 약 ${sheet.r.before.toFixed(1)}km` : '지도 위치가 있는 카드가 더 있으면 거리도 계산해줘요.'}</Text>
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: c.mint, borderRadius: 22, padding: 16, gap: 2 }}>
              <Text style={[t.h, { color: c.green }]}>이동 거리 {sheet.r.before.toFixed(1)}km → {sheet.r.after.toFixed(1)}km</Text>
              <Text style={t.note}>밥, 숙소, 셔틀처럼 시간이 정해진 일정은 그대로 두고, 나머지 순서만 바꿨어요.</Text>
            </View>
            <Group>
              {sheet.r.preview.map((x, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: i ? 1.5 : 0, borderColor: c.line, backgroundColor: x.moved ? c.butter : 'transparent' }}>
                  <Text style={[t.label, { width: 48, color: c.sub }]}>{x.time}</Text>
                  <Text style={[t.label, { flex: 1 }]}>{x.title}{x.moved ? '  ↕' : ''}</Text>
                </View>
              ))}
            </Group>
            <Text style={[t.note, { marginHorizontal: 6 }]}>순서가 바뀐 곳의 이동 정보(전철 시간)는 지워져요. 다시 넣어주세요.</Text>
            <Button title="이 순서로 바꾸기" emoji="✨" onPress={() => { success(); dispatch({ type: 'reorderDay', dayIndex, changes: sheet.r.changes }); close(); }} />
          </>
        ))}
      </Sheet>

      {/* 이동 수단 */}
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
              <Field label="출발" placeholder="14:10" value={leg.depart} onChangeText={(v) => setLeg({ ...leg, depart: v })} keyboardType="numbers-and-punctuation" maxLength={7} />
              <Field label="내리는 곳" value={leg.toStop} onChangeText={(v) => setLeg({ ...leg, toStop: v })} />
              <Field label="도착" placeholder="14:14" value={leg.arrive} onChangeText={(v) => setLeg({ ...leg, arrive: v })} keyboardType="numbers-and-punctuation" maxLength={7} />
              <Field label="메모" placeholder="15분 간격" value={leg.note ?? ''} onChangeText={(v) => setLeg({ ...leg, note: v })} last />
            </Group>
            <Button title="저장" emoji="💾" disabled={!normTime(leg.depart) || !normTime(leg.arrive)}
              onPress={() => { success(); dispatch({ type: 'setTransit', dayIndex, itemId: sheet.itemId, leg: { ...leg, depart: normTime(leg.depart)!, arrive: normTime(leg.arrive)! } }); close(); }} />
            <Button title="이동 칸 지우기" kind="plain" fg={c.pink}
              onPress={() => { dispatch({ type: 'setTransit', dayIndex, itemId: sheet.itemId, leg: undefined }); close(); }} />
          </>
        )}
      </Sheet>

      {/* 비행기 */}
      <Sheet visible={sheet?.kind === 'flight'} title="비행기 정보 ✈️" onClose={close}>
        <Group>
          <Field label="편명" placeholder="KE765" value={flight.flightNo} onChangeText={(v) => setFlight({ ...flight, flightNo: v })} autoCapitalize="characters" autoCorrect={false} maxLength={8} />
          <Field label="출발 공항" placeholder="인천" value={flight.from} onChangeText={(v) => setFlight({ ...flight, from: v })} maxLength={12} />
          <Field label="출발 시간" placeholder="09:00" value={flight.depart} onChangeText={(v) => setFlight({ ...flight, depart: v })} keyboardType="numbers-and-punctuation" maxLength={7} />
          <Field label="도착 공항" placeholder="신치토세" value={flight.to} onChangeText={(v) => setFlight({ ...flight, to: v })} maxLength={12} />
          <Field label="도착 시간" placeholder="12:10" value={flight.arrive} onChangeText={(v) => setFlight({ ...flight, arrive: v })} keyboardType="numbers-and-punctuation" maxLength={7} last />
        </Group>
        <Text style={[t.note, { marginHorizontal: 6, marginTop: -6 }]}>{TIME_HINT}. 공항은 비워도 돼요.</Text>
        <Button title="저장" emoji="💾" disabled={!flightOk} onPress={saveFlight} />
        {sheet?.kind === 'flight' && day[sheet.direction] && <Button title="비행기 지우기" kind="plain" fg={c.pink} onPress={removeFlight} />}
      </Sheet>
    </>
  );
}
