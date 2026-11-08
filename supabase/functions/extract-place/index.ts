// 인스타 링크/캡션 → 장소 카드 (이름, 종류, 지역, 요약, 이모지)
// 필요한 비밀값: ANTHROPIC_API_KEY (Supabase 대시보드 → Edge Functions → Secrets)
const CATEGORIES = ['맛집', '카페', '관광지', '숙소', '교통', '쇼핑'];
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

/** 인스타 게시물 페이지에서 미리보기용 제목/설명(캡션)을 읽는다. 막히면 빈 값 */
async function readPost(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Accept-Language': 'ko,en;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return '';
    const html = (await r.text()).slice(0, 400_000);
    const meta = (p: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)="${p}"[^>]+content="([^"]*)"`, 'i'))?.[1] ?? '';
    return [meta('og:title'), meta('og:description'), meta('description')].filter(Boolean).map(decode).join('\n').slice(0, 4000);
  } catch {
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const { text = '', city = '' } = await req.json();
    const url = String(text).match(/https?:\/\/\S+/)?.[0];
    const fetched = url ? await readPost(url) : '';
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'no_api_key' }, 500);

    const prompt = `여행 계획 앱이에요. 친구가 공유한 인스타그램 게시물 정보를 보고, 그 게시물이 소개하는 장소 하나를 카드로 정리해 주세요.
여행 도시: ${city || '모름'}

[사용자가 붙여넣은 글]
${String(text).slice(0, 3000)}

[링크에서 읽은 게시물 미리보기]
${fetched || '(읽지 못함)'}

아래 JSON 하나만 출력하세요. 다른 말은 쓰지 마세요.
{"name": "장소 이름 (가게/명소 이름. 한국어로, 원어 이름이 있으면 괄호로)", "category": "${CATEGORIES.join('|')} 중 하나", "area": "동네/지역 (모르면 빈 문자열)", "summary": "친구들에게 보여줄 한두 문장 한국어 요약 (메뉴, 가격, 웨이팅, 팁 등 게시물에 있는 정보 위주, 지어내지 말 것)", "emoji": "장소를 나타내는 이모지 1개", "confident": true 또는 false (장소 이름을 확실히 알 수 있었는지)}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return json({ error: 'ai_failed', detail: (await r.text()).slice(0, 300) }, 502);
    const data = await r.json();
    const out = (data.content ?? []).map((b: { text?: string }) => b.text ?? '').join('');
    const card = JSON.parse(out.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    if (!CATEGORIES.includes(card.category)) card.category = '관광지';
    return json({ ...card, sourceUrl: url, readPost: !!fetched });
  } catch (e) {
    return json({ error: 'failed', detail: String(e) }, 500);
  }
});
