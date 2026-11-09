import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { normTime } from '../lib/util';
import { c, G, J } from '../theme';
import { select } from './haptics';
import { PressableScale } from './PressableScale';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, '0');

/** "14:30" → "오후 2:30" */
export const prettyTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h < 12 ? '오전' : '오후'} ${((h + 11) % 12) + 1}:${pad(m)}`;
};

function Chip({ label, on, dim, onPress }: { label: string; on: boolean; dim?: boolean; onPress: () => void }) {
  return (
    <PressableScale haptic={false} onPress={onPress} scaleTo={0.9}
      style={{ width: '15%', paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: on ? c.ink : dim ? '#F7F5FB' : '#F0ECF8' }}>
      <Text style={{ fontFamily: J, fontSize: 14, color: on ? '#fff' : dim ? c.faint : c.ink }}>{label}</Text>
    </PressableScale>
  );
}

/**
 * 시간 칸. 타자 대신 시(0~23)와 분(5분 단위) 버튼을 눌러 고른다.
 * Group 안에서 Field 와 같은 줄 모양으로 보이고, 누르면 아래로 선택판이 펼쳐진다.
 */
export function TimeField({ label, value, onChange, last, placeholder = '눌러서 시간 고르기' }: {
  label?: string; value: string; onChange: (hhmm: string) => void; last?: boolean; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const norm = normTime(value);
  const [h, m] = norm ? norm.split(':').map(Number) : [undefined, undefined];
  const pick = (nh: number, nm: number, close: boolean) => {
    select();
    onChange(`${pad(nh)}:${pad(nm)}`);
    if (close) setOpen(false);
  };
  const line = { borderBottomWidth: 1.5, borderColor: c.line };
  return (
    <View>
      <PressableScale haptic={false} onPress={() => { select(); setOpen((o) => !o); }} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 18, minHeight: 50 }}>
        {label && <Text style={{ fontFamily: J, fontSize: 15, color: c.ink, width: 78 }}>{label}</Text>}
        <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch', paddingRight: 18, paddingVertical: 10 }, (!last || open) && line]}>
          {norm ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ fontFamily: J, fontSize: 20, color: c.ink }}>{norm}</Text>
              <Text style={{ fontFamily: G, fontSize: 13, color: c.sub }}>{prettyTime(norm)}</Text>
            </View>
          ) : (
            <Text style={{ flex: 1, fontFamily: G, fontSize: 16, color: c.faint }}>{placeholder}</Text>
          )}
          <Text style={{ fontFamily: J, fontSize: 13, color: c.lilacDeep, backgroundColor: c.lilac, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, overflow: 'hidden' }}>{open ? '닫기' : '고르기'}</Text>
        </View>
      </PressableScale>
      {open && (
        <Animated.View entering={FadeIn.duration(160)} style={[{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, gap: 8 }, !last && line]}>
          <Text style={{ fontFamily: J, fontSize: 12, color: c.sub, marginLeft: 2 }}>몇 시?  <Text style={{ fontFamily: G, color: c.faint }}>(0~5시는 새벽)</Text></Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' }}>
            {HOURS.map((x) => <Chip key={x} label={`${x}시`} on={h === x} dim={x < 6} onPress={() => pick(x, m ?? 0, false)} />)}
          </View>
          <Text style={{ fontFamily: J, fontSize: 12, color: c.sub, marginLeft: 2, marginTop: 4 }}>몇 분?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' }}>
            {MINS.map((x) => <Chip key={x} label={`${pad(x)}분`} on={m === x} onPress={() => pick(h ?? 12, x, true)} />)}
          </View>
        </Animated.View>
      )}
    </View>
  );
}
