'use client';

import { useState, useId } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
type FormError = 'invalid' | 'network' | null;
type DoneState = 'new' | 'already' | null;

interface Props {
  /** Called after successful sign-up so the parent can open the taste flow */
  onSignUp?: (email: string) => void;
}

// ── Chip data ────────────────────────────────────────────────────────────────
const MEDITATE_OPTS = ['Regularly', 'Sometimes', "Tried it, didn't stick", 'Never'];
const TONING_OPTS   = ['Yes', 'No', 'Not sure what that is'];

// ── Email validation ─────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ── Save — POST /api/signup → Cloudflare Pages Function → D1 + Loops ────────
async function saveRecord(payload: {
  email: string;
  meditate: string | null;
  toning: string | null;
}): Promise<{ ok: boolean; already: boolean }> {
  const res = await fetch('/api/signup', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) return { ok: false, already: false };
  const data = await res.json() as { ok: boolean; already?: boolean };
  return { ok: data.ok, already: data.already ?? false };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function JoinSection({ onSignUp }: Props) {
  const meditateId = useId();
  const toningId   = useId();

  const [email,    setEmail]    = useState('');
  const [meditate, setMeditate] = useState<string | null>(null);
  const [toning,   setToning]   = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<FormError>(null);
  const [done,     setDone]     = useState<DoneState>(null);

  const emailLineColor = error === 'invalid'
    ? 'var(--color-accent-light)'
    : 'var(--color-hairline-input)';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('invalid');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await saveRecord({ email: email.trim(), meditate, toning });
      if (res.ok) {
        setDone(res.already ? 'already' : 'new');
        if (!res.already) onSignUp?.(email.trim());
      } else {
        setError('network');
      }
    } catch {
      setError('network');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="join"
      data-screen-label="05 Join"
      style={{
        minHeight: '100svh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14vh 16px 0',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Glass card */}
      <div style={{
        width: '100%',
        maxWidth: 460,
        boxSizing: 'border-box',
        padding: 'clamp(24px,5vw,40px)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 4,
        background: 'var(--color-glass)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}>
        {done ? (
          /* ── Success state ───────────────────────────────────────────── */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            textAlign: 'center',
            padding: '12px 0',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 400,
              fontSize: 44,
              lineHeight: 1,
              margin: 0,
              color: 'var(--color-text-head)',
            }}>
              {done === 'already' ? "You're already on the list." : "You're on the list."}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--color-text-sec3)', margin: 0 }}>
              {done === 'already' ? "We'll be in touch." : "We'll write when the beta opens."}
            </p>
          </div>
        ) : (
          /* ── Form ────────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 26, margin: 0 }}>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 400,
              fontSize: 44,
              lineHeight: 1,
              margin: 0,
              color: 'var(--color-text-head)',
            }}>
              Join the beta
            </h2>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-label="Email"
                placeholder="your@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                onFocus={e  => (e.currentTarget.style.borderBottomColor = 'var(--color-accent)')}
                onBlur={e   => (e.currentTarget.style.borderBottomColor = emailLineColor)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${emailLineColor}`,
                  borderRadius: 0,
                  color: 'var(--color-text)',
                  padding: '12px 0',
                  font: '400 18px var(--font-body)',
                  outline: 'none',
                  minHeight: 48,
                  width: '100%',
                }}
              />
              {error && (
                <div role="alert" style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-accent-light)' }}>
                  {error === 'invalid'
                    ? "That email doesn\u2019t look quite right."
                    : 'Something went wrong. Try again in a moment.'}
                </div>
              )}
            </div>

            {/* Meditate chips */}
            <ChipFieldset
              legend="Do you meditate?"
              legendId={meditateId}
              options={MEDITATE_OPTS}
              value={meditate}
              onChange={setMeditate}
            />

            {/* Toning chips */}
            <ChipFieldset
              legend="Ever tried vocal toning, humming or chanting as a practice?"
              legendId={toningId}
              options={TONING_OPTS}
              value={toning}
              onChange={setToning}
            />

            {/* Submit + fine print */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: 'transparent',
                  color: 'var(--color-accent-light)',
                  border: '1px solid var(--color-accent)',
                  borderRadius: 999,
                  padding: '15px 28px',
                  minHeight: 52,
                  font: '500 16px var(--font-body)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  transition: 'background 0.15s, opacity 0.15s',
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'var(--color-tint-hover)'; }}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onMouseDown={e  => { if (!saving) e.currentTarget.style.background = 'var(--color-tint-press)'; }}
                onMouseUp={e    => { if (!saving) e.currentTarget.style.background = 'var(--color-tint-hover)'; }}
              >
                {saving ? 'Saving\u2026' : 'Save my spot'}
              </button>

              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--color-text-sec3)', textWrap: 'pretty' }}>
                Private iPhone beta via TestFlight opens in November. Spots are limited.
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-muted)' }}>
                No spam. Just beta news. Unsubscribe anytime.{' '}
                <a href="/privacy">Privacy policy</a>
              </p>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <SiteFooter />
    </section>
  );
}

// ── Chip fieldset ─────────────────────────────────────────────────────────────
function ChipFieldset({
  legend, legendId, options, value, onChange,
}: {
  legend: string;
  legendId: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <legend id={legendId} style={{ padding: 0, marginBottom: 12, fontSize: 16, lineHeight: 1.45, color: 'var(--color-text)' }}>
        {legend}
      </legend>
      <div role="group" aria-labelledby={legendId} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => {
          const selected = value === opt;
          return (
            <Chip
              key={opt}
              label={opt}
              selected={selected}
              onClick={() => onChange(selected ? null : opt)}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

// ── Single chip ───────────────────────────────────────────────────────────────
function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        background: selected ? 'var(--color-tint-chip)' : 'transparent',
        color: selected ? 'var(--color-accent-light)' : 'var(--color-text-sec)',
        border: `1px solid ${selected ? 'var(--color-accent)' : 'rgba(255,230,180,0.3)'}`,
        borderRadius: 999,
        padding: '10px 14px',
        minHeight: 44,
        font: '400 15px var(--font-body)',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = selected ? 'var(--color-accent)' : 'rgba(255,230,180,0.3)')}
    >
      {label}
    </button>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function SiteFooter() {
  return (
    <footer style={{
      marginTop: 'auto',
      width: '100%',
      maxWidth: 960,
      boxSizing: 'border-box',
      padding: '16vh 6px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 18,
      textAlign: 'center',
    }}>
      <p style={{
        margin: 0,
        fontFamily: 'var(--font-heading)',
        fontStyle: 'italic',
        fontSize: 20,
        lineHeight: 1.4,
        color: 'var(--color-text-sec)',
      }}>
        Made by Mâni Nilchiani — Musician and Creative Technologist building a mindful future.
      </p>

      <div style={{
        width: '100%',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '6px 16px',
        paddingTop: 18,
        borderTop: '1px solid rgba(255,230,180,0.18)',
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--color-text-muted)',
      }}>
        <span>Cosmic Picnic is a wellness practice, not medical care.</span>
        <a href="/privacy">Privacy policy</a>
        <a href="mailto:hum@cosmicpicnic.app">Contact</a>
      </div>
    </footer>
  );
}
