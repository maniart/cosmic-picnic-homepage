'use client';

import { useEffect, useRef } from 'react';
import { useAudio } from '@/hooks/useAudio';

// ── 2-D canvas starfield ──────────────────────────────────────────────────────
function useStarfield(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onInteract: () => void,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const g      = canvas.getContext('2d')!;
    const cols   = ['255,245,220', '255,214,122', '255,194,92'];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    type Star   = { x: number; y: number; r: number; big: boolean; c: string; s: number; p: number };
    type Ripple = { x: number; y: number; t0: number };

    let W = 0, H = 0, dpr = 1;
    let stars:   Star[]   = [];
    let ripples: Ripple[] = [];
    let rafId = 0;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W   = window.innerWidth;
      H   = window.innerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      const n = Math.round(W * H / 2600);
      stars = Array.from({ length: n }, () => {
        const big = Math.random() < 0.05;
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          r: big ? 1.2 + Math.random() * 1.2 : 0.35 + Math.random() * 0.8,
          big,
          c: cols[Math.random() < 0.3 ? 0 : Math.random() < 0.6 ? 1 : 2],
          s: 0.5 + Math.random() * 2.4,
          p: Math.random() * 6.28,
        };
      });
    };

    const draw = (t: number) => {
      g.clearRect(0, 0, W, H);

      // Stars
      for (const s of stars) {
        const tw = reduced
          ? 0.8
          : 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.001 * s.s + s.p), 2);

        if (s.big) {
          const rg = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
          rg.addColorStop(0, `rgba(${s.c},${(0.35 * tw).toFixed(3)})`);
          rg.addColorStop(1, `rgba(${s.c},0)`);
          g.fillStyle = rg;
          g.fillRect(s.x - s.r * 6, s.y - s.r * 6, s.r * 12, s.r * 12);
        }

        g.fillStyle = `rgba(${s.c},${tw.toFixed(3)})`;
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, 6.283);
        g.fill();
      }

      // Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp  = ripples[i];
        const age = (t - rp.t0) / 1000;
        for (let j = 0; j < 4; j++) {
          const a = age - j * 0.16;
          if (a <= 0) continue;
          const o = Math.max(0, 1 - a / 1.9) * 0.8;
          if (!o) continue;
          g.strokeStyle = j === 0
            ? `rgba(225,173,102,${o.toFixed(3)})`
            : `rgba(255,236,196,${o.toFixed(3)})`;
          g.lineWidth = 1;
          g.beginPath();
          g.arc(rp.x, rp.y, 6 + a * 70, 0, 6.283);
          g.stroke();
        }
        if (age > 2.6) ripples.splice(i, 1);
      }

      if (!reduced || ripples.length > 0) {
        rafId = requestAnimationFrame(draw);
      }
    };

    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest('input,button,select,textarea,a,label')) return;

      if (!reduced) {
        ripples.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
        if (!rafId) rafId = requestAnimationFrame(draw);
      }
      onInteract();
    };

    const onResize = () => {
      resize();
      if (reduced) draw(0);
    };

    resize();
    reduced ? draw(0) : (rafId = requestAnimationFrame(draw));

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', onResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ── Sections data ─────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    n: '01',
    heading: 'What we collect',
    body: (
      <>
        <p>When you join the beta on this website, we collect:</p>
        <ul>
          <li><strong>Your email address</strong> (required).</li>
          <li><strong>Your answers to two optional questions:</strong> whether you meditate, and whether you have tried vocal toning, humming or chanting.</li>
          <li><strong>Your ratings from the 90-second taste</strong>, if you give them.</li>
        </ul>
        <p>We do <strong>not</strong> collect your name, address, phone number, payment details, or browsing history. This website uses no analytics, advertising scripts or tracking pixels.</p>
      </>
    ),
  },
  {
    n: '02',
    heading: 'How we use it',
    body: (
      <>
        <ul>
          <li>To send your TestFlight invitation when the beta opens.</li>
          <li>To send occasional beta news. Every email has an unsubscribe link.</li>
          <li>To understand who the beta is for, using your optional answers and ratings in aggregate.</li>
        </ul>
        <p>We never sell, rent or share your data for marketing.</p>
      </>
    ),
  },
  {
    n: '03',
    heading: 'Your voice and the microphone',
    body: (
      <>
        <p>The iPhone app asks for microphone access so it can respond to your humming and toning in real time. Your voice is processed on your device to shape harmony, haptics and the avatar. It is not recorded, stored or uploaded.</p>
        <p>You can turn off microphone access at any time in iOS Settings.</p>
      </>
    ),
  },
  {
    n: '04',
    heading: 'Third parties',
    body: (
      <>
        <p>We rely on a small number of services:</p>
        <ul>
          <li><strong>Cloudflare:</strong> hosts this website and stores the beta list and your optional answers in a database we control.</li>
          <li><strong>Loops:</strong> holds your email and optional answers so we can send TestFlight invitations and beta news on our behalf.</li>
          <li><strong>Apple TestFlight:</strong> delivers the beta app. When you accept an invitation, Apple shares basic tester information with us, such as your email, install date and crash reports. Apple&rsquo;s privacy policy applies to TestFlight.</li>
          <li><strong>Google Fonts and public code libraries:</strong> this website loads its typefaces, 3D library and map outlines from public content delivery networks. These requests share your IP address with those providers, as with any web page.</li>
        </ul>
      </>
    ),
  },
  {
    n: '05',
    heading: 'How long we keep it',
    body: (
      <p>We keep your sign-up details until the beta ends or until you unsubscribe or ask us to delete them, whichever comes first. After the beta, we will ask before keeping you on any future list.</p>
    ),
  },
  {
    n: '06',
    heading: 'Your rights',
    body: (
      <>
        <p>You can ask to see, correct, export or delete the data we hold about you at any time. Email us and we will do it within 30 days. Unsubscribing from beta emails takes one click.</p>
        <p>These rights apply wherever you live, including under the GDPR in the European Union and the CCPA in California.</p>
      </>
    ),
  },
  {
    n: '07',
    heading: 'Children',
    body: (
      <p>Cosmic Picnic is not directed at children under 16, and we do not knowingly collect their data. If you believe a child has signed up, contact us and we will delete their details.</p>
    ),
  },
  {
    n: '08',
    heading: 'Changes to this policy',
    body: (
      <p>If this policy changes, the &ldquo;Last updated&rdquo; date above will change too. We will email beta members about substantive changes, such as a new kind of data being collected, before they take effect.</p>
    ),
  },
  {
    n: '09',
    heading: 'Governing law',
    body: (
      <p>This policy is governed by the laws of the United States. Any disputes will be resolved under the applicable law of the jurisdiction where the developer resides.</p>
    ),
  },
  {
    n: '10',
    heading: 'Contact',
    body: (
      <p>Questions, concerns or requests? Email <a href="mailto:hum@cosmicpicnic.app">hum@cosmicpicnic.app</a>. One human reads that inbox, and they will reply.</p>
    ),
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PrivacyClient() {
  const audio     = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundOnRef = useRef(false);

  // Keep a ref mirror so the starfield callback can read it without a stale closure
  soundOnRef.current = audio.soundOn;

  useStarfield(canvasRef, () => {
    if (!audio.audioStarted) {
      audio.startAmbient();
    } else if (soundOnRef.current) {
      audio.chime();
    }
  });

  return (
    <div style={{
      minHeight:            '100vh',
      background:           'radial-gradient(120% 70% at 50% 0%, #15245a 0%, #0a1238 40%, #050820 100%) fixed',
      color:                'var(--color-text)',
      fontFamily:           'var(--font-body)',
      WebkitFontSmoothing:  'antialiased',
    }}>
      {/* Starfield canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
      />

      {/* Header */}
      <header style={{
        position:       'relative',
        zIndex:         1,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            12,
        padding:        `16px clamp(16px, 4vw, 40px)`,
      }}>
        <a href="/" style={{
          fontFamily:     'var(--font-heading)',
          fontWeight:     500,
          fontSize:       22,
          color:          'var(--color-text)',
          textDecoration: 'none',
        }}>
          Cosmic Picnic
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 14 }}>
          <a href="/">← Back to home</a>
          <a href="mailto:hum@cosmicpicnic.app">Contact</a>

          {/* Sound toggle */}
          <button
            onClick={audio.toggleSound}
            aria-label="Toggle sound"
            aria-pressed={audio.soundOn}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              background:     'transparent',
              color:          'var(--color-text)',
              border:         '1px solid rgba(255,230,180,0.3)',
              borderRadius:   999,
              padding:        0,
              width:          44,
              minHeight:      44,
              cursor:         'pointer',
              transition:     'border-color .2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,230,180,0.3)')}
          >
            {audio.soundOn ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z" />
                <path d="M16 9a5 5 0 0 1 0 6" />
                <path d="M19.4 18.4a9 9 0 0 0 0-12.7" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z" />
                <line x1="22" x2="16" y1="9" y2="15" />
                <line x1="16" x2="22" y1="9" y2="15" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{
        position:   'relative',
        zIndex:     1,
        maxWidth:   680,
        margin:     '0 auto',
        padding:    '9vh 22px 12vh',
        boxSizing:  'border-box',
      }}>
        {/* Eyebrow */}
        <p style={{
          margin:        '0 0 18px',
          fontSize:      13,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         'var(--color-accent)',
        }}>
          Cosmic Picnic / Privacy
        </p>

        {/* Title */}
        <h1 style={{
          fontFamily:    'var(--font-heading)',
          fontWeight:    400,
          fontSize:      'clamp(48px, 7vw, 84px)',
          lineHeight:    0.95,
          letterSpacing: '-0.01em',
          margin:        0,
        }}>
          Privacy <em>policy.</em>
        </h1>

        <p style={{ margin: '22px 0 0', fontSize: 14, color: 'var(--color-text-muted)', fontFeatureSettings: '"tnum"' }}>
          Last updated · October 6, 2026
        </p>

        {/* "In short" callout */}
        <div style={{
          margin:       '48px 0 8px',
          padding:      '26px 0',
          borderTop:    '1px solid var(--color-accent)',
          borderBottom: '1px solid rgba(255,230,180,0.25)',
        }}>
          <p style={{
            margin:      '0 0 10px',
            fontFamily:  'var(--font-heading)',
            fontStyle:   'italic',
            fontSize:    20,
            color:       'var(--color-accent-light)',
          }}>
            In short
          </p>
          <p style={{
            margin:      0,
            fontFamily:  'var(--font-heading)',
            fontWeight:  500,
            fontSize:    'clamp(21px, 2.4vw, 25px)',
            lineHeight:  1.4,
            color:       'var(--color-text-head)',
            textWrap:    'pretty' as React.CSSProperties['textWrap'],
          }}>
            We collect your email and, if you choose, two short answers about your practice. We use them only to invite you to the beta and send beta news. Your voice stays on your iPhone. We never sell your data.
          </p>
        </div>

        <p style={{ margin: '22px 0 0', fontSize: 16, lineHeight: 1.7, color: 'var(--color-text-sec3)', textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>
          Cosmic Picnic is made and maintained by an independent developer, Mâni Nilchiani. This policy covers this website and the private iPhone beta distributed through TestFlight.
        </p>

        {/* Numbered sections */}
        <section style={{ marginTop: 56, display: 'flex', flexDirection: 'column' }}>
          {SECTIONS.map((sec, idx) => (
            <div
              key={sec.n}
              style={{
                display:             'grid',
                gridTemplateColumns: '52px minmax(0, 1fr)',
                gap:                 6,
                padding:             '34px 0',
                borderTop:           '1px solid rgba(255,230,180,0.25)',
                borderBottom:        idx === SECTIONS.length - 1 ? '1px solid rgba(255,230,180,0.25)' : undefined,
              }}
            >
              <span style={{
                fontFamily:         'var(--font-heading)',
                fontSize:           26,
                lineHeight:         1.2,
                color:              'var(--color-accent-numeral)',
                fontFeatureSettings: '"tnum"',
              }}>
                {sec.n}
              </span>

              <div className="privacy-body" style={{
                display:       'flex',
                flexDirection: 'column',
                gap:           14,
                fontSize:      16,
                lineHeight:    1.7,
                color:         'var(--color-text-sec3)',
                textWrap:      'pretty' as React.CSSProperties['textWrap'],
              }}>
                <h2 style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 500,
                  fontSize:   30,
                  lineHeight: 1.15,
                  margin:     0,
                  color:      'var(--color-text)',
                }}>
                  {sec.heading}
                </h2>
                {sec.body}
              </div>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer style={{
          marginTop:       48,
          display:         'flex',
          flexWrap:        'wrap',
          justifyContent:  'space-between',
          gap:             '10px 20px',
          fontSize:        13,
          lineHeight:      1.5,
          color:           'var(--color-text-muted)',
        }}>
          <span>© 2026 Cosmic Picnic · A wellness practice, not medical care.</span>
          <a href="/">← Back to home</a>
        </footer>
      </main>

      {/* Inline styles for list/strong elements that need to match design */}
      <style>{`
        .privacy-body ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
        .privacy-body strong { font-weight: 500; color: var(--color-text); }
      `}</style>
    </div>
  );
}
