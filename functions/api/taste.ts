// Cloudflare Pages Function — POST /api/taste
// Updates the signup record with taste-flow results (before/after scores + noticed word).

interface Env {
  DB: D1Database;
}

interface TasteBody {
  email?: string;
  before_score?: number | null;
  after_score?: number | null;
  noticed_word?: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: TasteBody;
  try {
    body = (await request.json()) as TasteBody;
  } catch {
    return reply({ error: 'bad_request' }, 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return reply({ error: 'invalid_email' }, 422);
  }

  await env.DB
    .prepare(
      `UPDATE signups
         SET taste_started = 1,
             before_score  = ?,
             after_score   = ?,
             noticed_word  = ?
       WHERE email = ?`,
    )
    .bind(
      body.before_score  ?? null,
      body.after_score   ?? null,
      body.noticed_word?.trim() || null,
      email,
    )
    .run();

  return reply({ ok: true });
};

// ── CORS pre-flight ───────────────────────────────────────────────────────────
export const onRequestOptions: PagesFunction = () =>
  new Response(null, { status: 204, headers: corsHeaders() });

// ── Helpers ───────────────────────────────────────────────────────────────────
function reply(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
