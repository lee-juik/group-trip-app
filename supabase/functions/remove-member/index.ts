// 방장이 여행방에서 멤버를 내보낸다. 방장 = 여행을 만든 사람 (없으면 가장 먼저 들어온 사람)
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: '로그인이 필요해요' }, 401);

    const { memberId } = await req.json();
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: target } = await admin.from('members').select('id, trip_id').eq('id', memberId).maybeSingle();
    if (!target) return json({ ok: true });

    const { data: trip } = await admin.from('trips').select('created_by').eq('id', target.trip_id).single();
    const { data: members } = await admin.from('members').select('id, user_id').eq('trip_id', target.trip_id).order('joined_at');
    const host = members?.find((m) => m.user_id === trip?.created_by) ?? members?.[0];
    if (!host || host.user_id !== user.id) return json({ error: '방장만 내보낼 수 있어요' }, 403);
    if (host.id === target.id) return json({ error: '방장은 나갈 수 없어요' }, 400);

    const { error } = await admin.from('members').delete().eq('id', target.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
