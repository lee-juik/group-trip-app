import { useMemo, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { AvatarStack } from '../components/Avatar';
import { Button } from '../components/Button';
import { HeartButton } from '../components/HeartButton';
import { LargeHeaderScreen } from '../components/LargeHeaderScreen';
import { MeButton } from '../components/MeButton';
import { Pill } from '../components/Pill';
import { PressableScale } from '../components/PressableScale';
import { RegisterSheet } from '../components/RegisterSheet';
import { Sheet } from '../components/Sheet';
import { confirmAsync, mapsUrl, todayIndex } from '../lib/util';
import { useTrip } from '../store';
import { c, categoryStyle, J, t } from '../theme';
import { CATEGORIES, Category, Member, PlaceCard } from '../types';

/** 링크를 연다. http가 빠져 있으면 붙여서 */
const openLink = (u: string) => Linking.openURL(/^https?:\/\//i.test(u) ? u : `https://${u}`).catch(() => {});

function DdayCard() {
  const { trip } = useTrip().state;
  const idx = todayIndex(trip.days);
  const first = trip.days[0]?.date;
  const dday = first ? Math.ceil((Date.parse(`${first}T00:00:00`) - Date.now()) / 864e5) : 0;
  // 여행 전 / 여행 중 / 여행 후에 따라 다르게
  const [label, big] = idx < 0
    ? ['출발까지', dday > 0 ? `D-${dday}` : 'D-DAY']
    : idx >= trip.days.length ? ['여행 끝!', '다녀왔어요 ✨'] : [`${trip.city}에서`, `여행 ${idx + 1}일차 🎉`];
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} style={{ borderRadius: 32, padding: 20, backgroundColor: '#F3DDF0', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', inset: 0, backgroundColor: '#E3D7FF', opacity: 0.6, transform: [{ skewY: '-12deg' }, { translateY: 60 }] } as object} />
      <View style={{ position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.38)', right: -30, top: -44 }} />
      <View style={{ position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', right: 70, bottom: -30 }} />
      <Text style={{ fontFamily: J, fontSize: 14, color: c.lilacDeep }}>{label}</Text>
      <Text style={{ fontFamily: J, fontSize: idx < 0 ? 48 : 34, lineHeight: 54, color: '#fff', textShadowColor: 'rgba(160,110,200,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 }}>
        {big}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <AvatarStack members={trip.members} size={32} />
        <Text style={{ fontFamily: J, fontSize: 14, color: c.lilacDeep }}>{trip.members.length}명이 함께 가요</Text>
      </View>
    </Animated.View>
  );
}

function PlaceTile({ p, index, onPress }: { p: PlaceCard; index: number; onPress: () => void }) {
  const { state, dispatch } = useTrip();
  const cs = categoryStyle[p.category];
  const members = p.wantedBy.map((id) => state.trip.members.find((m) => m.id === id)).filter((m): m is Member => !!m);
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 50).springify().damping(16)}
      layout={LinearTransition.springify().damping(16)}
      style={{ width: '48%' }}
    >
      <PressableScale scaleTo={0.96} onPress={onPress} style={{ backgroundColor: cs.bg, borderRadius: 28, padding: 14, minHeight: 186, gap: 4 }}>
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

const Tag = ({ children }: { children: string }) => (
  <Text style={{ fontFamily: J, fontSize: 12, color: c.lilacDeep, backgroundColor: c.lilac, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, overflow: 'hidden' }}>{children}</Text>
);

/** 카드를 누르면 열리는 자세히 보기: 메모 전체, 링크, 지도, 하트, 수정/지우기 */
function PlaceDetail({ place, onClose, onEdit }: { place: PlaceCard | null; onClose: () => void; onEdit: (p: PlaceCard) => void }) {
  const { state, dispatch } = useTrip();
  const { trip, meId } = state;
  const p = place ? trip.places.find((x) => x.id === place.id) ?? place : null; // 최신 값으로
  const cs = p ? categoryStyle[p.category] : undefined;
  const fans = p ? p.wantedBy.map((id) => trip.members.find((m) => m.id === id)).filter((m): m is Member => !!m) : [];
  const scheduled = p ? trip.days.flatMap((d, i) => d.items.filter((it) => it.placeId === p.id).map((it) => ({ day: i + 1, time: it.time }))) : [];
  const remove = async () => {
    if (!p) return;
    const ok = await confirmAsync(`'${p.name}' 카드를 지울까요?`, scheduled.length ? `일정에 들어간 ${scheduled.length}개는 이름만 남아요.` : '하트도 같이 지워져요.', '지우기', true);
    if (!ok) return;
    dispatch({ type: 'removePlace', placeId: p.id });
    onClose();
  };
  return (
    <Sheet visible={!!place} title={p && cs ? `${p.emoji ?? cs.emoji} ${p.name}` : ''} onClose={onClose}>
      {p && cs && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Tag>{`${cs.emoji} ${p.category}`}</Tag>
            {p.area ? <Tag>{`📍 ${p.area}`}</Tag> : null}
            {scheduled.map((s, i) => <Tag key={i}>{`🗓 ${s.day}일차 ${s.time}`}</Tag>)}
            {p.lat != null && <Tag>🧭 지도 위치 있음</Tag>}
          </View>
          <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 16 }}>
            <Text style={[t.body, !p.summary && { color: c.faint }]}>{p.summary || '메모가 아직 없어요. 수정에서 적어 둘 수 있어요.'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 22, padding: 14 }}>
            <HeartButton on={p.wantedBy.includes(meId)} count={p.wantedBy.length} onPress={() => dispatch({ type: 'toggleWant', placeId: p.id })} />
            <Text style={[t.note, { flex: 1 }]} numberOfLines={2}>{fans.length ? `${fans.map((m) => m.name).join(', ')} 가고 싶어요` : '아직 아무도 하트를 안 눌렀어요'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="구글맵에서 열기" emoji="🗺" kind="soft" style={{ flex: 1, paddingVertical: 12 }} onPress={() => openLink(mapsUrl(p, trip.city))} />
            {!!p.sourceUrl && <Button title="링크 열기" emoji="🔗" kind="soft" style={{ flex: 1, paddingVertical: 12 }} onPress={() => openLink(p.sourceUrl!)} />}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="수정" emoji="✏️" style={{ flex: 1 }} onPress={() => onEdit(p)} />
            <Button title="지우기" emoji="🗑" kind="soft" fg={c.pink} style={{ flex: 1 }} onPress={remove} />
          </View>
          <Text style={[t.note, { textAlign: 'center' }]}>{trip.members.find((m) => m.id === p.addedBy)?.name ?? '누군가'} 님이 넣었어요</Text>
        </>
      )}
    </Sheet>
  );
}

export function PoolScreen() {
  const { state } = useTrip();
  const { trip, meId } = state;
  const me = trip.members.find((m) => m.id === meId);
  const [filter, setFilter] = useState<Category | '전체'>('전체');
  const [register, setRegister] = useState(false);
  const [editing, setEditing] = useState<PlaceCard | undefined>();
  const [detail, setDetail] = useState<PlaceCard | null>(null);

  const places = useMemo(
    () => trip.places.filter((p) => filter === '전체' || p.category === filter).sort((a, b) => b.wantedBy.length - a.wantedBy.length),
    [trip.places, filter],
  );
  // 자세히 보기 시트를 닫고 나서 수정 시트를 연다 (시트 두 개가 겹치지 않게)
  const openEdit = (p: PlaceCard) => { setDetail(null); setTimeout(() => { setEditing(p); setRegister(true); }, 260); };

  return (
    <>
      <LargeHeaderScreen greeting={`${me?.name ?? '여행자'} 님, 안녕!`} title={`${trip.city} 가서\n뭐 먹고 뭐 할까? ☃️`} compactTitle="모아보기" right={<MeButton />}>
        <DdayCard />

        <Button title="가고 싶은 곳 추가" emoji="✏️" kind="soft" onPress={() => { setEditing(undefined); setRegister(true); }} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingVertical: 6 }}>
          <Pill label="전체" on={filter === '전체'} onPress={() => setFilter('전체')} />
          {CATEGORIES.map((k) => (
            <Pill key={k} label={k} emoji={categoryStyle[k].emoji} on={filter === k} onPress={() => setFilter(k)} />
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
          {places.map((p, i) => <PlaceTile key={p.id} p={p} index={i} onPress={() => setDetail(p)} />)}
        </View>
        {places.length === 0 && <Text style={[t.note, { textAlign: 'center', paddingVertical: 30 }]}>아직 비어 있어요. 가고 싶은 곳을 추가해볼까요?</Text>}
        <Text style={[t.note, { textAlign: 'center', fontSize: 12 }]}>카드를 누르면 메모 전체·지도·수정이 열려요</Text>
      </LargeHeaderScreen>

      <RegisterSheet visible={register} initial={editing} onClose={() => setRegister(false)} />
      <PlaceDetail place={detail} onClose={() => setDetail(null)} onEdit={openEdit} />
    </>
  );
}
