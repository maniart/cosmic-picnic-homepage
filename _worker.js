// Cloudflare Pages Advanced Mode worker
// Handles /api/* routes; everything else falls through to static assets.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

async function handleSignup(request, env) {
  let body;
  try { body = await request.json(); } catch { return reply({ error: 'bad_request' }, 400); }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return reply({ error: 'invalid_email' }, 422);

  const existing = await env.DB
    .prepare('SELECT id FROM signups WHERE email = ?')
    .bind(email)
    .first();

  if (existing) return reply({ ok: true, already: true });

  const referrer = request.headers.get('referer') ?? '';
  await env.DB
    .prepare('INSERT INTO signups (email, meditate_answer, toning_answer, referrer) VALUES (?, ?, ?, ?)')
    .bind(email, body.meditate ?? null, body.toning ?? null, referrer)
    .run();

  if (env.LOOPS_API_KEY) {
    try {
      await fetch('https://app.loops.so/api/v1/contacts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.LOOPS_API_KEY}` },
        body: JSON.stringify({
          email,
          source: 'cosmic-picnic-website',
          subscribed: true,
          userGroup: 'beta-waitlist',
          meditateAnswer: body.meditate ?? '',
          toningAnswer: body.toning ?? '',
        }),
      });
    } catch { /* Loops down must not block signup */ }
  }

  return reply({ ok: true, already: false });
}

async function handleTaste(request, env) {
  let body;
  try { body = await request.json(); } catch { return reply({ error: 'bad_request' }, 400); }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return reply({ error: 'invalid_email' }, 422);

  await env.DB
    .prepare(`UPDATE signups SET taste_started=1, before_score=?, after_score=?, noticed_word=? WHERE email=?`)
    .bind(body.before_score ?? null, body.after_score ?? null, body.noticed_word?.trim() || null, email)
    .run();

  return reply({ ok: true });
}

export default {
  async fetch(request, env) {
    try {
      const { pathname, method } = new URL(request.url);

      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }

      if (pathname === '/api/ping' && method === 'GET') {
        return reply({ pong: true });
      }

      if (pathname === '/api/signup' && method === 'POST') {
        return handleSignup(request, env);
      }

      if (pathname === '/api/taste' && method === 'POST') {
        return handleTaste(request, env);
      }

      // Fall through to static assets for everything else
      return env.ASSETS.fetch(request);
    } catch (err) {
      return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
