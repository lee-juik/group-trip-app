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

/** 가입 없이 바로 쓰도록 익명 계정으로 로그인. 한 번 만든 계정은 휴대폰에 저장된다 */
export async function ensureSignedIn(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error || !signed.user) throw new Error(error?.message ?? '로그인 실패');
  return signed.user.id;
}
