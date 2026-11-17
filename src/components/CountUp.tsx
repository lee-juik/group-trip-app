import { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

/** 숫자가 바뀌면 이전 값에서 새 값까지 또르르 올라간다 (처음엔 0부터) */
export function CountUp({ value, format, duration = 700, style }: { value: number; format: (n: number) => string; duration?: number; style?: StyleProp<TextStyle> }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  const cur = useRef(0);
  useEffect(() => {
    from.current = cur.current;
    const start = Date.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - start) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      cur.current = from.current + (value - from.current) * e;
      setShown(cur.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text style={style}>{format(shown)}</Text>;
}
