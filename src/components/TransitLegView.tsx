import { Linking, Text, View } from 'react-native';
import { lineOf, sameStop, stationOf, stopQuery, transferInfo } from '../lib/stations';
import { c, G, J, transitStyle } from '../theme';
import { TransitLeg } from '../types';
import { PressableScale } from './PressableScale';

/** 구글 지도 대중교통 길찾기를 연다. 아는 역은 일본어 역 이름으로 찾아서 엉뚱한 곳으로 안 가게 한다 */
export function openTransitDirections(from: string, to: string, city: string) {
  const q = (s: string) => encodeURIComponent(stopQuery(s, city));
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${q(from)}&destination=${q(to)}&travelmode=transit`);
}
const openStop = (stop: string, city: string) =>
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopQuery(stop, city))}`);

export const minutes = (a: string, b: string) => {
  const m = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const d = m(b) - m(a);
  return Number.isFinite(d) && d > 0 ? `${d}분` : '';
};

const codeColor = (code: string, fallback: string) => ({ N: '#00A04B', T: '#F08C00', H: '#0079C2' } as Record<string, string>)[code[0]] ?? fallback;

function Badge({ code, color }: { code: string; color: string }) {
  return (
    <View style={{ minWidth: 26, height: 22, borderRadius: 7, backgroundColor: color, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
      <Text style={{ fontFamily: J, fontSize: 12, color: '#fff' }}>{code}</Text>
    </View>
  );
}

/** 역 한 줄: 한국어 이름 + 현지 표지판 이름 + 역 번호. 누르면 지도 */
function Stop({ name, time, color, city, label }: { name: string; time: string; color: string; city: string; label: string }) {
  const st = stationOf(name);
  return (
    <PressableScale scaleTo={0.97} onPress={() => openStop(name, city)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ width: 16, alignItems: 'center', paddingTop: 3 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: color, backgroundColor: '#fff' }} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontFamily: J, fontSize: 13, color: c.sub }}>{time} {label}</Text>
          <Text style={{ fontFamily: J, fontSize: 16, color: c.ink }}>{name}</Text>
          {st?.codes?.filter((x) => x !== 'JR' && x !== '電').map((x) => (
            <Text key={x} style={{ fontFamily: J, fontSize: 11, color: codeColor(x, color), borderWidth: 1.5, borderColor: codeColor(x, color), borderRadius: 6, paddingHorizontal: 4, overflow: 'hidden' }}>{x}</Text>
          ))}
          <Text style={{ fontSize: 12 }}>📍</Text>
        </View>
        {st && <Text style={{ fontFamily: G, fontSize: 12, color: c.sub }}>{st.ja} · {st.en}</Text>}
        {st?.tip && <Text style={{ fontFamily: G, fontSize: 12, color: c.orange }}>💡 {st.tip}</Text>}
      </View>
    </PressableScale>
  );
}

/** 일정 사이의 이동: 타는 역 → 내리는 역을 노선 색 선으로 잇는다. 앞 구간에서 갈아타면 크게 알려준다 */
export function TransitLegView({ leg, prev, city, onEdit }: { leg: TransitLeg; prev?: TransitLeg; city: string; onEdit: () => void }) {
  const ts = transitStyle[leg.mode];
  const line = lineOf(leg);
  const color = line?.color ?? ts.fg;
  const dur = minutes(leg.depart, leg.arrive);
  const xfer = transferInfo(prev, leg);
  const walk = leg.mode === '도보' || leg.mode === '택시' || leg.mode === '렌트카';
  return (
    <View style={{ gap: 6 }}>
      {xfer && (
        <View style={{ backgroundColor: c.butter, borderRadius: 16, paddingVertical: 9, paddingHorizontal: 12, gap: 3 }}>
          <Text style={{ fontFamily: J, fontSize: 15, color: '#8A6410' }}>🔁 {xfer.at}에서 갈아타요</Text>
          <Text style={{ fontFamily: G, fontSize: 13, color: '#8A6410' }}>{xfer.from} → {xfer.to}</Text>
          {xfer.tip && <Text style={{ fontFamily: G, fontSize: 12, color: '#8A6410' }}>👣 {xfer.tip}</Text>}
        </View>
      )}
      <View style={{ backgroundColor: ts.bg, borderRadius: 20, paddingVertical: 11, paddingHorizontal: 13, gap: 8 }}>
        <PressableScale scaleTo={0.98} onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {line ? <Badge code={line.code} color={line.color} /> : <Text style={{ fontSize: 16 }}>{ts.emoji}</Text>}
          <Text style={{ flex: 1, fontFamily: J, fontSize: 15, color: ts.fg }} numberOfLines={2}>
            {leg.line || leg.mode}{dur ? ` · ${dur}` : ''}
          </Text>
          <Text style={{ fontFamily: J, fontSize: 12, color: c.sub }}>고치기</Text>
        </PressableScale>
        {walk ? (
          <Text style={{ fontFamily: G, fontSize: 13, color: ts.fg }}>{leg.depart} {leg.fromStop} → {leg.arrive} {leg.toStop}</Text>
        ) : (
          <View>
            <Stop name={leg.fromStop} time={leg.depart} color={color} city={city} label="타기" />
            <View style={{ marginLeft: 6, width: 4, height: 14, backgroundColor: color, borderRadius: 2, marginVertical: 2 }} />
            <Stop name={leg.toStop} time={leg.arrive} color={color} city={city} label="내리기" />
          </View>
        )}
        {!!leg.note && <Text style={{ fontFamily: G, fontSize: 12, color: c.ink }}>📝 {leg.note}</Text>}
        <PressableScale scaleTo={0.97} onPress={() => openTransitDirections(leg.fromStop, leg.toStop, city)}
          style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 11 }}>
          <Text style={{ fontFamily: J, fontSize: 13, color: c.ink }}>🗺 지도로 길찾기 · 실시간 시간표</Text>
        </PressableScale>
      </View>
    </View>
  );
}

/** 그날 탈 것 한 줄 요약: 공항 →JR→ 삿포로 🔁 →H→ 호스이스스키노 */
export function DayTransitSummary({ legs }: { legs: TransitLeg[] }) {
  const ride = legs.filter((l) => l.mode !== '도보');
  if (ride.length < 2) return null;
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 14, gap: 8 }}>
      <Text style={{ fontFamily: J, fontSize: 15, color: c.ink }}>🚉 오늘 탈 것 한눈에</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
        {ride.map((l, i) => {
          const line = lineOf(l);
          const xfer = i > 0 && transferInfo(ride[i - 1], l);
          const joined = i > 0 && sameStop(ride[i - 1].toStop, l.fromStop);
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {!joined && <Text style={{ fontFamily: G, fontSize: 13, color: c.ink }}>{i > 0 ? '  ·  ' : ''}{l.depart} {l.fromStop}</Text>}
              {xfer && <Text style={{ fontSize: 13 }}>🔁</Text>}
              <Text style={{ fontFamily: J, fontSize: 12, color: '#fff', backgroundColor: line?.color ?? c.sub, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' }}>
                {line?.name ?? l.line ?? l.mode}
              </Text>
              <Text style={{ fontFamily: G, fontSize: 13, color: c.ink }}>→ {l.toStop}</Text>
            </View>
          );
        })}
      </View>
      <Text style={{ fontFamily: G, fontSize: 12, color: c.sub }}>🔁 표시가 있는 역에서 노선을 갈아타요</Text>
    </View>
  );
}
