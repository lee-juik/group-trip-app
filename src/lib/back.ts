import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * 뒤로가기(안드로이드 버튼, 화면 밀기)를 누르면 앱이 꺼지지 않고 열려 있는 창만 닫히게 한다.
 * 창이 열릴 때 브라우저 기록에 한 칸을 넣어 두고, 뒤로가기가 오면 맨 위 창을 닫는다.
 */
const stack: { id: number; close: () => void }[] = [];
let ignore = 0;   // 우리가 직접 history.back() 한 횟수 (그때 오는 popstate 는 무시)
let seq = 0;
let listening = false;

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener('popstate', () => {
    if (ignore > 0) { ignore--; return; }
    stack.pop()?.close();
  });
}

export function useBackClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (Platform.OS !== 'web' || !open) return;
    listen();
    const id = ++seq;
    stack.push({ id, close: () => closeRef.current() });
    window.history.pushState({ ...(window.history.state ?? {}), back: id }, '');
    return () => {
      // 뒤로가기로 닫힌 경우엔 이미 빠져 있다. 버튼으로 닫은 경우엔 넣어 둔 기록 한 칸을 되돌린다
      const i = stack.findIndex((x) => x.id === id);
      if (i < 0) return;
      stack.splice(i, 1);
      ignore++;
      window.history.back();
    };
  }, [open]);
}
