import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// 공개용(publishable) 키라서 앱에 넣어도 된다. 데이터 보호는 DB의 보안 규칙(RLS)이 맡는다.
export const SUPABASE_URL = 'https://wtothatrncfccghnswny.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Ri25-wO9c7Uk4oH1wPOLsw_2c6KAsnQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

const isNetworkError = (e: { name?: string; status?: number; message: string }) =>
  e.name === 'AuthRetryableFetchError' || e.status === 0 || /fetch|network|Load failed|timeout/i.test(e.message);

/**
 * 가입 없이 바로 쓰도록 익명 계정으로 로그인. 한 번 만든 계정은 휴대폰에 저장된다.
 * 인터넷이 약해서 세션 확인에 실패한 경우에는 새 계정을 만들지 않고 오류를 던진다
 * (새 계정이 생기면 여행방의 내 자리와 연결이 끊어지기 때문).
 */
export async function ensureSignedIn(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  if (error) {
    if (isNetworkError(error)) throw new Error(`네트워크 오류: ${error.message}`);
    // 저장된 세션이 완전히 못 쓰게 된 경우(만료 등)에만 새로 만든다
  }
  const { data: signed, error: e2 } = await supabase.auth.signInAnonymously();
  if (e2 || !signed.user) throw new Error(e2?.message ?? '로그인 실패');
  return signed.user.id;
}
