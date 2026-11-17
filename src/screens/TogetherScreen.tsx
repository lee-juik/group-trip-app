import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Platform, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { CheckBox } from '../components/CheckBox';
import { CountUp } from '../components/CountUp';
import { DayTabs } from '../components/DayTabs';
import { Field, Group } from '../components/Field';
import { success } from '../components/haptics';
import { LargeHeaderScreen } from '../components/LargeHeaderScreen';
import { MeButton } from '../components/MeButton';
import { Pill } from '../components/Pill';
import { PressableScale } from '../components/PressableScale';
import { Sheet } from '../components/Sheet';
import {
  balances, catEmoji, Currency, CURRENCY, Expense, EXPENSE_CATS, ExpenseInput, fetchRate, krwOf, Photo, settle, Todo,
  useExpenses, usePhotos, useTodos,
  LiveStatus,
} from '../lib/together';
import { confirmAsync, todayIndex } from '../lib/util';
import { useTrip } from '../store';
import { c, G, J, softShadow, t } from '../theme';
import { Member } from '../types';

const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function useTripDates() {
  const { trip } = useTrip().state;
  const dates = trip.days.map((d) => d.date);
  const i = todayIndex(trip.days);
  const def = dates[Math.max(0, Math.min(i, dates.length - 1))] ?? todayStr();
  return { dates, def };
}

const card = [{ backgroundColor: '#fff', borderRadius: 24, padding: 16 }, softShadow];

// ───────────────────────── 준비물 ─────────────────────────

const SUGGEST = ['여권', '엔화 현금 · 트래블카드', 'eSIM / 유심', '돼지코(110V)', '보조배터리', '상비약', '핫팩 · 장갑', '미끄럼 방지 신발', '숙소 바우처'];

function TodoRow({ todo, members, meId, onToggle, onOpen }: { todo: Todo; members: Member[]; meId: string; onToggle: () => void; onOpen: () => void }) {
  const owner = todo.assignee ? members.find((m) => m.id === todo.assignee) : undefined;
  const mine = todo.checks.includes(meId);
  const everyone = !todo.assignee;
  const done = everyone ? members.length > 0 && members.every((m) => todo.checks.includes(m.id)) : todo.checks.includes(todo.assignee!);
  const canCheck = everyone || todo.assignee === meId;
  return (
    <Animated.View layout={LinearTransition.springify().damping(18)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
      <CheckBox on={everyone ? mine : done} disabled={!canCheck} onPress={onToggle} />
      <PressableScale scaleTo={0.98} onPress={onOpen} style={{ flex: 1, gap: 3 }}>
        <Text style={[t.label, done && { color: c.sub, textDecorationLine: 'line-through' }]}>{todo.title}</Text>
        <Text style={{ fontFamily: G, fontSize: 12, color: c.sub }}>{owner ? `👤 ${owner.name} 담당` : `👥 각자 챙기기 · ${todo.checks.length}/${members.length}`}</Text>
      </PressableScale>
      {everyone && (
        <View style={{ flexDirection: 'row' }}>
          {members.map((m, i) => (
            <View key={m.id} style={{ marginLeft: i ? -7 : 0, opacity: todo.checks.includes(m.id) ? 1 : 0.22 }}><Avatar member={m} size={24} /></View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

/** 인터넷이 약할 때: 빈 화면 대신 지금 무엇을 보고 있는지 알려준다 */
function LiveNote({ status, savedAt }: { status: LiveStatus; savedAt?: number }) {
  if (status === 'live') return null;
  const at = savedAt ? new Date(savedAt) : undefined;
  const when = at ? `${at.getMonth() + 1}/${at.getDate()} ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` : '';
  const text = status === 'loading' ? '불러오는 중…'
    : status === 'cached' ? `📡 인터넷이 약해요. 마지막으로 받아 둔 내용이에요${when ? ` (${when})` : ''}. 연결되면 알아서 새로 받아요.`
    : '📡 인터넷이 약해서 아직 못 불러왔어요. 지워진 게 아니에요! 연결되면 알아서 나와요.';
  return (
    <View style={{ backgroundColor: status === 'loading' ? '#fff' : '#FFF3C9', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: c.line }}>
      <Text style={{ fontFamily: G, fontSize: 13, color: c.ink, lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

function TodoSection() {
  const { trip, meId } = useTrip().state;
  const { todos, add, toggle, update, remove, status, savedAt } = useTodos();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [open, setOpen] = useState<Todo | null>(null);
  const [edit, setEdit] = useState({ title: '', assignee: null as string | null });
  const members = trip.members;
  const isDone = (x: Todo) => (x.assignee ? x.checks.includes(x.assignee) : members.every((m) => x.checks.includes(m.id)));
  const doneCount = todos.filter(isDone).length;
  const myLeft = todos.filter((x) => (x.assignee ? x.assignee === meId && !x.checks.includes(meId) : !x.checks.includes(meId))).length;
  const sorted = [...todos].sort((a, b) => Number(isDone(a)) - Number(isDone(b)));
  const submit = (s = title) => { const v = s.trim(); if (!v) return; if (todos.some((x) => x.title === v)) { setTitle(''); return; } add(v, assignee); success(); setTitle(''); setAssignee(null); };

  return (
    <>
      <LiveNote status={status} savedAt={savedAt} />
      <View style={[card, { backgroundColor: c.mint, gap: 4 }]}>
        <Text style={{ fontFamily: J, fontSize: 14, color: c.green }}>준비물 · 할 일</Text>
        <Text style={{ fontFamily: J, fontSize: 30, color: c.ink }}>{doneCount}/{todos.length} 끝</Text>
        <Text style={{ fontFamily: G, fontSize: 13, color: c.green }}>{myLeft ? `내가 챙길 게 ${myLeft}개 남았어요` : todos.length ? '내 건 다 챙겼어요 🎉' : status === 'live' ? '같이 챙길 것을 적어 보세요' : ' '}</Text>
      </View>

      <Group>
        <Field placeholder="예) 여권, 야키니쿠 예약하기" maxLength={200} value={title} onChangeText={setTitle} onSubmitEditing={() => submit()} returnKeyType="done" last />
      </Group>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label="각자 챙기기" emoji="👥" on={assignee === null} onPress={() => setAssignee(null)} />
        {members.map((m) => <Pill key={m.id} label={`${m.name} 담당`} on={assignee === m.id} onPress={() => setAssignee(m.id)} />)}
      </View>
      <Button title="넣기" emoji="➕" disabled={!title.trim()} onPress={() => submit()} />
      {status === 'live' && todos.length < 3 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {SUGGEST.filter((s) => !todos.some((x) => x.title === s)).map((s) => (
            <PressableScale key={s} onPress={() => submit(s)} style={{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 7, paddingHorizontal: 11, borderWidth: 1.5, borderColor: c.line }}>
              <Text style={{ fontFamily: J, fontSize: 13, color: c.sub }}>＋ {s}</Text>
            </PressableScale>
          ))}
        </View>
      )}

      {todos.length > 0 && (
        <View style={[{ backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' }, softShadow]}>
          {sorted.map((x, i) => (
            <View key={x.id} style={{ borderTopWidth: i ? 1.5 : 0, borderColor: c.line }}>
              <TodoRow todo={x} members={members} meId={meId} onToggle={() => { success(); toggle(x); }}
                onOpen={() => { setEdit({ title: x.title, assignee: x.assignee }); setOpen(x); }} />
            </View>
          ))}
        </View>
      )}
      <Text style={[t.note, { textAlign: 'center', fontSize: 12 }]}>각자 챙기기는 모두가 체크해야 끝나요. 이름을 누르면 고칠 수 있어요.</Text>

      <Sheet visible={!!open} title="준비물 고치기" onClose={() => setOpen(null)}>
        <Group><Field label="이름" maxLength={200} value={edit.title} onChangeText={(v) => setEdit({ ...edit, title: v })} last /></Group>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Pill label="각자 챙기기" emoji="👥" on={edit.assignee === null} onPress={() => setEdit({ ...edit, assignee: null })} />
          {members.map((m) => <Pill key={m.id} label={`${m.name} 담당`} on={edit.assignee === m.id} onPress={() => setEdit({ ...edit, assignee: m.id })} />)}
        </View>
        <Button title="저장" emoji="💾" disabled={!edit.title.trim()} onPress={() => { if (open) update(open.id, { title: edit.title.trim(), assignee: edit.assignee }); setOpen(null); }} />
        <Button title="지우기" emoji="🗑" kind="soft" fg={c.pink} onPress={async () => {
          if (open && (await confirmAsync(`'${open.title}'을(를) 지울까요?`, undefined, '지우기', true))) { remove(open.id); setOpen(null); }
        }} />
      </Sheet>
    </>
  );
}

// ───────────────────────── 정산 ─────────────────────────

function ExpenseSheet({ visible, initial, onClose, store }: { visible: boolean; initial?: Expense; onClose: () => void; store: ReturnType<typeof useExpenses> }) {
  const { trip, meId } = useTrip().state;
  const { expenses, add, update, remove, uploadReceipt } = store;
  const { dates, def } = useTripDates();
  const [receiptPreview, setReceiptPreview] = useState<string | undefined>();
  const [receiptBusy, setReceiptBusy] = useState(false);
  const all = trip.members.map((m) => m.id);
  const lastRate = [...expenses].reverse().find((e) => e.currency === 'JPY')?.rate;
  const blank = (): ExpenseInput => ({ title: '', amount: 0, currency: 'JPY', rate: lastRate ?? 9.3, paidBy: meId, splitAmong: all, category: '식비', spentOn: def, isTransfer: false, receiptPath: null });
  const [f, setF] = useState<ExpenseInput>(blank);
  const [amountText, setAmountText] = useState('');
  const [rateText, setRateText] = useState('');
  const curRef = useRef<Currency>('JPY');
  const [rateBusy, setRateBusy] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const x = initial ? { ...initial } : blank();
    setReceiptPreview(initial?.receiptUrl);
    curRef.current = x.currency; setRateBusy(false);
    setF(x); setAmountText(initial ? String(initial.amount) : ''); setRateText(String(x.rate));
    if (!initial && !lastRate) fetchRate('JPY').then((r) => { if (r && curRef.current === 'JPY') { setF((y) => ({ ...y, rate: r })); setRateText(String(r)); } });
  }, [visible]);
  const amount = /^\d+(\.\d{1,2})?$/.test(amountText.trim()) ? Number(amountText.trim()) : 0;
  const rate = f.currency === 'KRW' ? 1 : Number(rateText);
  const ok = f.title.trim() && amount > 0 && amount < 1e9 && rate > 0 && rate < 100000 && !rateBusy && f.splitAmong.length > 0;
  const each = ok ? krwOf({ amount, rate }) / f.splitAmong.length : 0;
  /** 영수증: 카메라로 찍거나 앨범에서 고른다 */
  const addReceipt = async (camera: boolean) => {
    const opt: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    if (camera && Platform.OS !== 'web' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return;
    const r = camera ? await ImagePicker.launchCameraAsync(opt) : await ImagePicker.launchImageLibraryAsync(opt);
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setReceiptPreview(a.uri); setReceiptBusy(true);
    const path = await uploadReceipt({ uri: a.uri, width: a.width, height: a.height, file: (a as { file?: Blob }).file, mimeType: a.mimeType, fileName: a.fileName });
    setReceiptBusy(false);
    if (path) setF((y) => ({ ...y, receiptPath: path })); else setReceiptPreview(undefined);
  };
  // 통화를 바꾸면 그 통화의 환율로 바꾼다. 받아오는 동안은 환율 칸을 비우고 저장을 막는다
  // (늦게 온 응답이 다른 통화의 환율을 덮어쓰지 않도록 마지막으로 고른 통화만 받는다)
  const setCur = async (cur: Currency) => {
    curRef.current = cur;
    setF((y) => ({ ...y, currency: cur }));
    if (cur === 'KRW') { setRateBusy(false); return; }
    const prev = [...expenses].reverse().find((e) => e.currency === cur && !e.isTransfer)?.rate;
    if (prev) { setRateText(String(prev)); setRateBusy(false); return; }
    setRateText(''); setRateBusy(true);
    const r = (await fetchRate(cur)) ?? (cur === 'USD' ? 1400 : 9.3);
    if (curRef.current !== cur) return;
    setRateText(String(r)); setRateBusy(false);
  };
  const save = () => {
    if (!ok) return;
    const e: ExpenseInput = { ...f, title: f.title.trim(), amount, rate };
    if (initial) update(initial.id, e); else add(e);
    success(); onClose();
  };
  const toggleSplit = (id: string) => setF({ ...f, splitAmong: f.splitAmong.includes(id) ? f.splitAmong.filter((x) => x !== id) : [...f.splitAmong, id] });

  return (
    <Sheet visible={visible} title={initial ? '지출 고치기' : '얼마 썼어요? 💸'} onClose={onClose}>
      <Group>
        <Field label="어디에" placeholder="스프카레 가라쿠" maxLength={100} value={f.title} onChangeText={(v) => setF({ ...f, title: v })} />
        <Field label={`금액 ${CURRENCY[f.currency].sign}`} placeholder="7200" keyboardType="decimal-pad" inputMode="decimal" value={amountText} maxLength={12} onChangeText={(v) => setAmountText(v.replace(/[０-９]/g, (d) => String(d.charCodeAt(0) - 0xff10)).replace(/,/g, '').replace(/[^\d.]/g, ''))} last={f.currency === 'KRW'} />
        {f.currency !== 'KRW' && <Field label="환율" placeholder="9.3" keyboardType="decimal-pad" inputMode="decimal" value={rateText} maxLength={8} onChangeText={(v) => setRateText(v.replace(',', '.').replace(/[^\d.]/g, ''))} last />}
      </Group>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['JPY', 'KRW', 'USD'] as Currency[]).map((k) => <Pill key={k} label={`${CURRENCY[k].sign} ${CURRENCY[k].label}`} on={f.currency === k} onPress={() => setCur(k)} />)}
      </View>
      {f.currency !== 'KRW' && <Text style={[t.note, { marginHorizontal: 6 }]}>{rateBusy ? '오늘 환율을 가져오는 중…' : `1${CURRENCY[f.currency].label} = ${rateText || '?'}원으로 계산해요`}{amount > 0 && rate > 0 ? ` · ${won(amount * rate)}` : ''}</Text>}

      <Text style={[t.small, { marginLeft: 6 }]}>무엇에</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {EXPENSE_CATS.map((k) => <Pill key={k.key} label={k.key} emoji={k.emoji} on={f.category === k.key} onPress={() => setF({ ...f, category: k.key })} />)}
      </View>
      <Text style={[t.small, { marginLeft: 6 }]}>누가 냈어요</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {trip.members.map((m) => <Pill key={m.id} label={m.name} on={f.paidBy === m.id} onPress={() => setF({ ...f, paidBy: m.id })} />)}
      </View>
      <Text style={[t.small, { marginLeft: 6 }]}>누구랑 나눠요 {each ? `· 1명당 ${won(each)}` : ''}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {trip.members.map((m) => <Pill key={m.id} label={m.name} on={f.splitAmong.includes(m.id)} onBg={c.green} onPress={() => toggleSplit(m.id)} />)}
      </View>
      {dates.length > 0 && (
        <>
          <Text style={[t.small, { marginLeft: 6 }]}>언제</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {dates.map((d, i) => <Pill key={d} label={`${i + 1}일 · ${md(d)}`} on={f.spentOn === d} onPress={() => setF({ ...f, spentOn: d })} />)}
          </View>
        </>
      )}
      <Text style={[t.small, { marginLeft: 6 }]}>영수증</Text>
      {receiptPreview ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 10, gap: 8 }}>
          <PressableScale scaleTo={0.98} onPress={() => receiptPreview && Linking.openURL(receiptPreview)}>
            <Image source={{ uri: receiptPreview }} style={{ width: '100%', height: 260, borderRadius: 16, backgroundColor: c.lilac }} resizeMode="contain" />
          </PressableScale>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={[t.note, { flex: 1, alignSelf: 'center' }]}>{receiptBusy ? '올리는 중…' : '누르면 크게 볼 수 있어요'}</Text>
            <PressableScale onPress={() => { setReceiptPreview(undefined); setF((y) => ({ ...y, receiptPath: null })); }} style={{ backgroundColor: c.pinkSoft, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 12 }}>
              <Text style={{ fontFamily: J, fontSize: 13, color: c.pink }}>빼기</Text>
            </PressableScale>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="찍기" emoji="📸" kind="soft" style={{ flex: 1, paddingVertical: 12 }} onPress={() => addReceipt(true)} />
          <Button title="앨범에서" emoji="🧾" kind="soft" style={{ flex: 1, paddingVertical: 12 }} onPress={() => addReceipt(false)} />
        </View>
      )}
      <Button title={receiptBusy ? '영수증 올리는 중…' : '저장'} emoji="💾" disabled={!ok || receiptBusy} onPress={save} />
      {initial && (
        <Button title="지우기" emoji="🗑" kind="soft" fg={c.pink} onPress={async () => {
          if (await confirmAsync(`'${initial.title}' 지출을 지울까요?`, undefined, '지우기', true)) { remove(initial.id); onClose(); }
        }} />
      )}
    </Sheet>
  );
}

function SettleSection() {
  const { trip, meId } = useTrip().state;
  const store = useExpenses();
  const { expenses, add } = store;
  const [sheet, setSheet] = useState<{ initial?: Expense } | null>(null);
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? '나간 멤버';
  const memberIds = trip.members.map((m) => m.id);
  const spend = expenses.filter((e) => !e.isTransfer);
  const total = spend.reduce((s, e) => s + krwOf(e), 0);
  const myShare = spend.filter((e) => e.splitAmong.includes(meId)).reduce((s, e) => s + krwOf(e) / e.splitAmong.length, 0);
  const bal = useMemo(() => balances(expenses, memberIds), [expenses, trip.members]);
  const plan = settle(bal);
  const byCat = EXPENSE_CATS.map((k) => ({ ...k, sum: spend.filter((e) => e.category === k.key).reduce((s, e) => s + krwOf(e), 0) })).filter((x) => x.sum > 0).sort((a, b) => b.sum - a.sum);
  const days = [...new Set(expenses.map((e) => e.spentOn))].sort().reverse();

  const markSent = async (p: { from: string; to: string; won: number }) => {
    if (!(await confirmAsync(`${name(p.from)} → ${name(p.to)} ${won(p.won)}`, '보냈다고 기록할까요? 정산 목록에서 빠져요.', '보냈어요'))) return;
    add({ title: '정산 송금', amount: p.won, currency: 'KRW', rate: 1, paidBy: p.from, splitAmong: [p.to], category: '기타', spentOn: todayStr(), isTransfer: true });
    success();
  };

  return (
    <>
      <LiveNote status={store.status} savedAt={store.savedAt} />
      <View style={[card, { backgroundColor: c.butter, gap: 6 }]}>
        <Text style={{ fontFamily: J, fontSize: 14, color: '#8A6410' }}>우리가 쓴 돈</Text>
        <CountUp value={total} format={won} style={{ fontFamily: J, fontSize: 32, color: c.ink }} />
        <Text style={{ fontFamily: G, fontSize: 13, color: '#8A6410' }}>내 몫 {won(myShare)} · {bal[meId] > 9 ? `받을 돈 ${won(bal[meId])}` : bal[meId] < -9 ? `줄 돈 ${won(-bal[meId])}` : '주고받을 돈 없음'}</Text>
        {byCat.length > 0 && (
          <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 6, backgroundColor: '#fff' }}>
            {byCat.map((x, i) => <View key={x.key} style={{ flex: x.sum, backgroundColor: ['#FFB38A', '#8FD9B6', '#B9A2FF', '#8CCBFF', '#FF9EB8', '#FFD36E', '#C9C3DA'][i % 7] }} />)}
          </View>
        )}
        {byCat.length > 0 && <Text style={{ fontFamily: G, fontSize: 12, color: '#8A6410' }}>{byCat.map((x) => `${x.emoji} ${x.key} ${Math.round((x.sum / total) * 100)}%`).join('  ')}</Text>}
      </View>
      <Button title="지출 넣기" emoji="➕" onPress={() => setSheet({})} />

      <View style={[card, { gap: 10 }]}>
        <Text style={t.label}>🤝 누가 누구에게</Text>
        {plan.length === 0 && <Text style={t.note}>{expenses.length ? '다 맞아요! 주고받을 돈이 없어요 🎉' : store.status === 'live' ? '지출을 넣으면 여기서 정산해 줘요' : '불러오는 중이에요…'}</Text>}
        {plan.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[t.body, { flex: 1 }]}><Text style={{ fontFamily: J }}>{name(p.from)}</Text> → <Text style={{ fontFamily: J }}>{name(p.to)}</Text>  {won(p.won)}</Text>
            {(p.from === meId || p.to === meId) && (
              <PressableScale onPress={() => markSent(p)} style={{ backgroundColor: c.mint, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 }}>
                <Text style={{ fontFamily: J, fontSize: 13, color: c.green }}>보냈어요</Text>
              </PressableScale>
            )}
          </View>
        ))}
        {plan.length > 0 && <Text style={[t.note, { fontSize: 12 }]}>가장 적은 횟수로 주고받게 계산했어요 (원화 기준)</Text>}
      </View>

      {days.map((d) => {
        const list = expenses.filter((e) => e.spentOn === d);
        const sum = list.filter((e) => !e.isTransfer).reduce((s, e) => s + krwOf(e), 0);
        const di = trip.days.findIndex((x) => x.date === d);
        return (
          <View key={d} style={{ gap: 8 }}>
            <Text style={[t.small, { marginLeft: 6 }]}>{di >= 0 ? `${di + 1}일차 · ` : ''}{md(d)} · {won(sum)}</Text>
            <View style={[{ backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' }, softShadow]}>
              {list.map((e, i) => (
                <PressableScale key={e.id} scaleTo={0.98} onPress={() => setSheet({ initial: e })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderTopWidth: i ? 1.5 : 0, borderColor: c.line }}>
                  <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: e.isTransfer ? c.mint : '#F6F0FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{e.isTransfer ? '💌' : catEmoji(e.category)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={t.label} numberOfLines={1}>{e.isTransfer ? `${name(e.paidBy)} → ${name(e.splitAmong[0])} 송금` : e.title}{e.receiptPath ? ' 🧾' : ''}</Text>
                    <Text style={{ fontFamily: G, fontSize: 12, color: c.sub }} numberOfLines={1}>
                      {e.isTransfer ? '정산 완료' : `${name(e.paidBy)} 결제 · ${e.splitAmong.length === trip.members.length ? '모두' : e.splitAmong.map(name).join(', ')}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={t.label}>{CURRENCY[e.currency].sign}{e.amount.toLocaleString('ko-KR')}</Text>
                    {e.currency !== 'KRW' && <Text style={{ fontFamily: G, fontSize: 11, color: c.sub }}>≈ {won(krwOf(e))}</Text>}
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>
        );
      })}
      <ExpenseSheet visible={!!sheet} initial={sheet?.initial} onClose={() => setSheet(null)} store={store} />
    </>
  );
}

// ───────────────────────── 사진 ─────────────────────────

function PhotoSection() {
  const { trip, meId } = useTrip().state;
  const { photos, upload, setCaption, remove, status, savedAt } = usePhotos();
  const { dates, def } = useTripDates();
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [open, setOpen] = useState<Photo | null>(null);
  const [caption, setCap] = useState('');
  const [day, setDay] = useState(def);
  const [w, setW] = useState(0);
  const name = (id: string | null) => trip.members.find((m) => m.id === id)?.name ?? '누군가';
  const size = w ? (w - 12) / 3 : 0;

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 30, quality: 1 });
    if (r.canceled || !r.assets.length) return;
    setBusy({ done: 0, total: r.assets.length });
    const n = await upload(r.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height, file: (a as { file?: Blob }).file, mimeType: a.mimeType, fileName: a.fileName })), day, (done) => setBusy({ done, total: r.assets.length }));
    setBusy(null);
    if (n) success();
  };
  const groups = [...new Set(photos.map((p) => p.takenOn))].sort().reverse();
  const cur = open ? photos.find((p) => p.id === open.id) ?? open : null;

  return (
    <>
      <LiveNote status={status} savedAt={savedAt} />
      <View style={[card, { backgroundColor: '#FFDDEB', gap: 4 }]}>
        <Text style={{ fontFamily: J, fontSize: 14, color: c.pink }}>우리 앨범</Text>
        <Text style={{ fontFamily: J, fontSize: 30, color: c.ink }}>{photos.length}장</Text>
        <Text style={{ fontFamily: G, fontSize: 13, color: c.pink }}>원본 화질 그대로 올라가요. 우리 방 멤버만 볼 수 있어요</Text>
      </View>
      {dates.length > 1 && <DayTabs options={dates.map((d, i) => `${i + 1}일`)} index={Math.max(0, dates.indexOf(day))} onChange={(i) => setDay(dates[i])} />}
      <Button title={busy ? `올리는 중… ${busy.done}/${busy.total}` : `${dates.indexOf(day) >= 0 ? `${dates.indexOf(day) + 1}일차 ` : ''}사진 올리기`} emoji="📷" disabled={!!busy} onPress={pick} />

      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ gap: 14 }}>
        {photos.length === 0 && status === 'live' && <Text style={[t.note, { textAlign: 'center', paddingVertical: 24 }]}>아직 사진이 없어요. 첫 사진을 올려 볼까요? 📸</Text>}
        {size > 0 && groups.map((g) => {
          const di = dates.indexOf(g);
          const list = photos.filter((p) => p.takenOn === g);
          return (
            <View key={g} style={{ gap: 8 }}>
              <Text style={[t.small, { marginLeft: 6 }]}>{di >= 0 ? `${di + 1}일차 · ` : ''}{md(g)} · {list.length}장</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {list.map((p) => (
                  <PressableScale key={p.id} scaleTo={0.95} onPress={() => { setCap(p.caption ?? ''); setOpen(p); }}
                    style={{ width: size, height: size, borderRadius: 16, overflow: 'hidden', backgroundColor: c.lilac }}>
                    {p.thumbUrl || p.url ? <Animated.View entering={FadeIn} style={{ flex: 1 }}><Image source={{ uri: p.thumbUrl || p.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></Animated.View>
                      : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>🖼</Text></View>}
                  </PressableScale>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <Sheet visible={!!cur} title={cur ? `${name(cur.memberId)} 님의 사진` : ''} onClose={() => setOpen(null)}>
        {cur && (
          <>
            {(cur.thumbUrl || cur.url) && <Image source={{ uri: cur.thumbUrl || cur.url }} style={{ width: '100%', aspectRatio: cur.width && cur.height ? cur.width / cur.height : 1, borderRadius: 20, backgroundColor: c.lilac }} resizeMode="contain" />}
            {cur.memberId === meId ? (
              <Group><Field placeholder="한 줄 남기기 (예: 오타루 운하 야경 🏮)" maxLength={300} value={caption} onChangeText={setCap} onBlur={() => caption !== (cur.caption ?? '') && setCaption(cur, caption.trim())} last /></Group>
            ) : !!cur.caption && <Text style={[t.body, { textAlign: 'center' }]}>{cur.caption}</Text>}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {cur.url && <Button title="원본 열기 · 저장" emoji="⬇️" kind="soft" style={{ flex: 1 }} onPress={() => Linking.openURL(cur.url!)} />}
              {cur.memberId === meId && (
                <Button title="지우기" emoji="🗑" kind="soft" fg={c.pink} style={{ flex: 1 }} onPress={async () => {
                  if (await confirmAsync('이 사진을 지울까요?', '친구들 앨범에서도 사라져요.', '지우기', true)) { remove(cur); setOpen(null); }
                }} />
              )}
            </View>
            {Platform.OS === 'web' && <Text style={[t.note, { textAlign: 'center', fontSize: 12 }]}>아이폰은 원본을 연 뒤 사진을 꾹 눌러 '사진에 저장'을 고르면 돼요</Text>}
          </>
        )}
      </Sheet>
    </>
  );
}

// ───────────────────────── 탭 ─────────────────────────

const SEGS = [
  { key: 'todo', label: '준비물', emoji: '🎒' },
  { key: 'money', label: '정산', emoji: '💰' },
  { key: 'photo', label: '사진', emoji: '📷' },
] as const;

export function TogetherScreen() {
  const [seg, setSeg] = useState<(typeof SEGS)[number]['key']>('todo');
  return (
    <LargeHeaderScreen greeting="같이 챙기고, 나누고, 남기기" title="함께 🎒" compactTitle="함께" right={<MeButton />}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {SEGS.map((s) => (
          <View key={s.key} style={{ flex: 1 }}>
            <Pill label={s.label} emoji={s.emoji} on={seg === s.key} onPress={() => setSeg(s.key)} />
          </View>
        ))}
      </View>
      <Animated.View key={seg} entering={FadeInDown.springify().damping(18)} style={{ gap: 14 }}>
        {seg === 'todo' && <TodoSection />}
        {seg === 'money' && <SettleSection />}
        {seg === 'photo' && <PhotoSection />}
      </Animated.View>
    </LargeHeaderScreen>
  );
}
