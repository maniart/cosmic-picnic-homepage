// Cloudflare Pages Function — POST /api/signup
// Saves a beta sign-up to D1 and creates a contact in Loops.

interface Env {
  DB: D1Database;
  LOOPS_API_KEY: string;
}

interface SignupBody {
  email?: string;
  meditate?: string | null;
  toning?: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return reply({ error: 'bad_request' }, 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return reply({ error: 'invalid_email' }, 422);
  }

  // ── Check for duplicate ─────────────────────────────────────────────────────
  const existing = await env.DB
    .prepare('SELECT id FROM signups WHERE email = ?')
    .bind(email)
    .first<{ id: number }>();

  if (existing) {
    return reply({ ok: true, already: true });
  }

  // ── Insert into D1 ──────────────────────────────────────────────────────────
  const referrer = request.headers.get('referer') ?? '';

  await env.DB
    .prepare(
      'INSERT INTO signups (email, meditate_answer, toning_answer, referrer) VALUES (?, ?, ?, ?)',
    )
    .bind(email, body.meditate ?? null, body.toning ?? null, referrer)
    .run();

  // ── Add contact to Loops ────────────────────────────────────────────────────
  if (env.LOOPS_API_KEY) {
    try {
      await fetch('https://app.loops.so/api/v1/contacts/create', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${env.LOOPS_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          source:          'cosmic-picnic-website',
          subscribed:      true,
          userGroup:       'beta-waitlist',
          meditateAnswer:  body.meditate ?? '',
          toningAnswer:    body.toning   ?? '',
        }),
      });
    } catch {
      // Loops being down must not block the sign-up response.
    }
  }

  return reply({ ok: true, already: false });
};

// ── CORS pre-flight ──────────────────────────────────────────────────────────
export const onRequestOptions: PagesFunction = () =>
  new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });

// ── Helpers ──────────────────────────────────────────────────────────────────
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
