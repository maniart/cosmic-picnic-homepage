'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AudioAPI } from '@/hooks/useAudio';

// ── Constants ─────────────────────────────────────────────────────────────────
const PRACTICE_SEC = 90;
const RING_CIRC    = 578; // 2π × 92

// [startTime, instruction, chimeKind?]
const LINES: [number, string, ('in' | 'out')?][] = [
  [0,  'Get comfortable. Let your shoulders drop.'],
  [6,  'Listen to the ambient soundscape. This tone is your guide.'],
  [16, 'Breathe in through your nose.',                          'in'],
  [20, 'Out through your mouth. Stay with the sound.',          'out'],
  [26, 'Once more. In through your nose.',                      'in'],
  [30, 'Out through your mouth. Just listen.',                  'out'],
  [36, 'Third breath. In through your nose.',                   'in'],
  [40, 'Now hum along with the soundscape. Lips closed, low and easy.', 'out'],
  [48, 'Breathe in.',                                            'in'],
  [52, 'Hum with the tone. Feel where it buzzes.',              'out'],
  [60, 'Breathe in.',                                            'in'],
  [64, 'Hum. Let your voice settle into the sound.',            'out'],
  [72, 'Breathe in.',                                            'in'],
  [76, 'Last hum. Let it fade into the soundscape.',            'out'],
  [84, 'Rest here. Keep listening.'],
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 'confirmed' | 'later' | 'before' | 'practice' | 'after' | 'reflection';

interface Props {
  open:    boolean;
  onClose: () => void;
  audio:   AudioAPI;
  email:   string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TasteFlow({ open, onClose, audio, email }: Props) {
  const [step,        setStep]        = useState<Step>('confirmed');
  const [beforeScore, setBeforeScore] = useState<number | null>(null);
  const [afterScore,  setAfterScore]  = useState<number | null>(null);
  const [word,        setWord]        = useState('');
  const [elapsed,     setElapsed]     = useState(0);

  const practiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const laterTimer    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const startTimer    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const firedBeats    = useRef(new Set<number>());
  const reduced       = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // ── Reset when dialog opens ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setStep('confirmed');
    setBeforeScore(null);
    setAfterScore(null);
    setWord('');
    setElapsed(0);
  }, [open]);

  // ── Cleanup helpers ────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (practiceTimer.current) { clearInterval(practiceTimer.current); practiceTimer.current = null; }
    if (laterTimer.current)    { clearTimeout(laterTimer.current);     laterTimer.current    = null; }
    if (startTimer.current)    { clearTimeout(startTimer.current);     startTimer.current    = null; }
    firedBeats.current.clear();
  }, []);

  const handleClose = useCallback(() => {
    clearTimers();
    audio.stopPractice();
    audio.setPracticeLevel(false);
    onClose();
  }, [clearTimers, audio, onClose]);

  // ── Start practice ─────────────────────────────────────────────────────────
  const startPractice = useCallback(() => {
    clearTimers();
    audio.setPracticeLevel(true);
    // Boot audio engine if first interaction (ring=false — bowl is the start cue)
    if (!audio.audioStarted || audio.soundOn) audio.startAmbient(false);

    let bowlStruck = false;
    const t0 = performance.now();

    const id = setInterval(() => {
      const el = (performance.now() - t0) / 1000;

      if (!bowlStruck) { bowlStruck = true; audio.strikeBowl(); }

      LINES.forEach(([t, , beat], i) => {
        if (beat && el >= t && el < t + 1 && !firedBeats.current.has(i)) {
          firedBeats.current.add(i);
          audio.breathChime(beat);
        }
      });

      if (el >= PRACTICE_SEC) {
        clearInterval(id);
        practiceTimer.current = null;
        audio.setPracticeLevel(false);
        setElapsed(PRACTICE_SEC);
        setStep('after');
        return;
      }
      setElapsed(el);
    }, 250);

    practiceTimer.current = id;
    setStep('practice');
    setElapsed(0);
  }, [clearTimers, audio]);

  // ── Step transitions ───────────────────────────────────────────────────────
  const goToLater = useCallback(() => {
    setStep('later');
    laterTimer.current = setTimeout(() => handleClose(), 3200);
  }, [handleClose]);

  const goToBefore = useCallback(() => setStep('before'), []);

  const pickBefore = useCallback((n: number) => {
    setBeforeScore(n);
    clearTimeout(startTimer.current ?? undefined);
    startTimer.current = setTimeout(() => startPractice(), 450);
  }, [startPractice]);

  const skipPractice = useCallback(() => {
    clearTimers();
    audio.stopPractice();
    audio.setPracticeLevel(false);
    setStep('after');
  }, [clearTimers, audio]);

  const goToReflection = useCallback(() => {
    setStep('reflection');
    if (email) {
      fetch('/api/taste', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          before_score:  beforeScore,
          after_score:   afterScore,
          noticed_word:  word.trim() || null,
        }),
      }).catch(() => {});
    }
  }, [email, beforeScore, afterScore, word]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => { clearTimers(); }, [clearTimers]);

  if (!open) return null;

  // ── Current line index for practice ───────────────────────────────────────
  let lineIdx = 0;
  LINES.forEach(([t], i) => { if (elapsed >= t) lineIdx = i; });

  // Breathing glow scale — ~15 s cycle
  const glowScale = reduced.current
    ? 1
    : 0.8 + 0.25 * Math.sin(elapsed * Math.PI / 7.5);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Taste of Cosmic Picnic"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--color-overlay)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
      }}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 14, right: 14,
          width: 44, height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-sec3)',
          cursor: 'pointer',
          borderRadius: 999,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent-light)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-sec3)')}
      >
        <IconX />
      </button>

      {/* Content panel */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {step === 'confirmed'  && <StepConfirmed  onBegin={goToBefore} onLater={goToLater} />}
        {step === 'later'      && <StepLater />}
        {step === 'before'     && <StepScale title="How do you feel right now?" value={beforeScore} onPick={pickBefore} />}
        {step === 'practice'   && (
          <StepPractice
            elapsed={elapsed}
            lineIdx={lineIdx}
            glowScale={glowScale}
            ringOffset={RING_CIRC * (1 - Math.min(1, elapsed / PRACTICE_SEC))}
            onSkip={skipPractice}
          />
        )}
        {step === 'after'      && (
          <StepAfter
            value={afterScore}
            onPick={setAfterScore}
            word={word}
            onWord={setWord}
            onDone={goToReflection}
          />
        )}
        {step === 'reflection' && (
          <StepReflection before={beforeScore} after={afterScore} />
        )}
      </div>
    </div>
  );
}

// ── Step: confirmed ───────────────────────────────────────────────────────────
function StepConfirmed({ onBegin, onLater }: { onBegin: () => void; onLater: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'clamp(40px,8vw,56px)', lineHeight: 1, margin: 0, color: 'var(--color-text-head)' }}>
        You&rsquo;re on the list.
      </h2>
      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: 'var(--color-text-sec3)' }}>
        We&rsquo;ll write when the beta opens.
      </p>
      <p style={{ margin: '12px 0 0', fontSize: 17, lineHeight: 1.6, color: 'var(--color-text-sec)', paddingTop: 20, borderTop: '1px solid var(--color-hairline)' }}>
        Want a taste first? 90 seconds. Headphones help.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <OutlinePill onClick={onBegin} style={{ padding: '14px 40px', minHeight: 52 }}>
          Begin
        </OutlinePill>
        <GhostLink onClick={onLater}>Maybe later</GhostLink>
      </div>
    </div>
  );
}

// ── Step: later ───────────────────────────────────────────────────────────────
function StepLater() {
  return (
    <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(36px,7vw,48px)', lineHeight: 1.1, margin: 0, color: 'var(--color-text-head)' }}>
      See you in November.
    </h2>
  );
}

// ── Step: before / after scale ────────────────────────────────────────────────
function StepScale({
  title, value, onPick,
}: { title: string; value: number | null; onPick: (n: number) => void }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'clamp(36px,7vw,48px)', lineHeight: 1.05, margin: 0, color: 'var(--color-text-head)', textWrap: 'balance' }}>
        {title}
      </h2>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(n => {
            const sel = value === n;
            return (
              <button
                key={n}
                onClick={() => onPick(n)}
                aria-label={n === 1 ? '1 Buzzing' : n === 5 ? '5 Settled' : String(n)}
                aria-pressed={sel}
                style={{
                  width: 56, height: 56,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: sel ? 'rgba(225,173,102,0.18)' : 'transparent',
                  color: sel ? 'var(--color-accent-light)' : 'var(--color-text)',
                  border: `1px solid ${sel ? 'var(--color-accent)' : 'rgba(255,230,180,0.35)'}`,
                  font: '400 22px var(--font-heading)',
                  fontFeatureSettings: "'tnum'",
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = sel ? 'var(--color-accent)' : 'rgba(255,230,180,0.35)')}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--color-text-muted)' }}>
          <span>Buzzing</span>
          <span>Settled</span>
        </div>
      </div>
    </div>
  );
}

// ── Step: practice ────────────────────────────────────────────────────────────
function StepPractice({
  elapsed, lineIdx, glowScale, ringOffset, onSkip,
}: {
  elapsed: number;
  lineIdx: number;
  glowScale: number;
  ringOffset: number;
  onSkip: () => void;
}) {
  void elapsed; // used by parent for glowScale/ringOffset/lineIdx, kept in signature for clarity
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>
      {/* Progress ring + glow */}
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        {/* Breathing radial glow */}
        <div style={{
          position: 'absolute',
          inset: 28,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(250,203,141,0.28) 0%, rgba(250,203,141,0) 70%)',
          transform: `scale(${glowScale.toFixed(3)})`,
          transition: 'transform 1.2s ease-in-out',
        }} />
        {/* Ring SVG */}
        <svg width="200" height="200" viewBox="0 0 200 200"
          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="100" cy="100" r="92"
            fill="none"
            stroke="rgba(255,230,180,0.16)"
            strokeWidth="1"
          />
          {/* Progress arc */}
          <circle cx="100" cy="100" r="92"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={ringOffset}
            style={{ transition: 'stroke-dashoffset 0.3s linear' }}
          />
        </svg>
      </div>

      {/* Crossfading instruction lines */}
      <div style={{ position: 'relative', width: '100%', minHeight: '5.4em' }}>
        {LINES.map(([, text], i) => (
          <p
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              margin: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(26px,5vw,32px)',
              lineHeight: 1.3,
              color: 'var(--color-text-head)',
              textWrap: 'balance',
              opacity: i === lineIdx ? 1 : 0,
              transition: 'opacity 1.6s ease',
            }}
          >
            {text}
          </p>
        ))}
      </div>

      <GhostLink onClick={onSkip}>Skip</GhostLink>
    </div>
  );
}

// ── Step: after ───────────────────────────────────────────────────────────────
function StepAfter({
  value, onPick, word, onWord, onDone,
}: {
  value: number | null;
  onPick: (n: number) => void;
  word: string;
  onWord: (w: string) => void;
  onDone: () => void;
}) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <StepScale title="And now?" value={value} onPick={onPick} />

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <input
          type="text"
          aria-label="One word for what you noticed"
          placeholder="One word for what you noticed"
          value={word}
          onChange={e => onWord(e.target.value)}
          maxLength={40}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--color-hairline-input)',
            borderRadius: 0,
            color: 'var(--color-text)',
            padding: '12px 0',
            font: '400 17px var(--font-body)',
            textAlign: 'center',
            outline: 'none',
            minHeight: 48,
            width: '100%',
          }}
          onFocus={e  => (e.currentTarget.style.borderBottomColor = 'var(--color-accent)')}
          onBlur={e   => (e.currentTarget.style.borderBottomColor = 'var(--color-hairline-input)')}
        />

        <OutlinePill
          onClick={onDone}
          disabled={value === null}
          style={{ alignSelf: 'center', padding: '14px 40px', minHeight: 52, opacity: value === null ? 0.45 : 1 }}
        >
          Done
        </OutlinePill>
      </div>
    </div>
  );
}

// ── Step: reflection ──────────────────────────────────────────────────────────
function StepReflection({ before, after }: { before: number | null; after: number | null }) {
  const improved = after !== null && before !== null && after > before;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 400,
        fontSize: 'clamp(36px,7vw,52px)',
        lineHeight: 1.05,
        margin: 0,
        color: 'var(--color-text-head)',
        textWrap: 'balance',
      }}>
        {improved
          ? `You went from ${before} to ${after}.`
          : 'Thanks for trying.'}
      </h2>
      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: 'var(--color-text-sec)', textWrap: 'pretty' }}>
        {improved
          ? 'That was you, humming alone. In Cosmic Picnic, the sound hums back.'
          : 'Some days take more than 90 seconds. In Cosmic Picnic, the sound hums back.'}
      </p>
      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: 'var(--color-text-sec3)' }}>
        We&rsquo;ll write when the beta opens.
      </p>
    </div>
  );
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
function OutlinePill({
  children, onClick, disabled, style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        color: 'var(--color-accent-light)',
        border: '1px solid var(--color-accent)',
        borderRadius: 999,
        font: '500 16px var(--font-body)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s, opacity 0.2s',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--color-tint-hover)'; }}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      onMouseDown={e  => { if (!disabled) e.currentTarget.style.background = 'var(--color-tint-press)'; }}
      onMouseUp={e    => { if (!disabled) e.currentTarget.style.background = 'var(--color-tint-hover)'; }}
    >
      {children}
    </button>
  );
}

function GhostLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--color-text-sec3)',
        font: '400 15px var(--font-body)',
        textDecoration: 'underline',
        textUnderlineOffset: 3,
        textDecorationColor: 'rgba(230,220,198,0.4)',
        padding: '12px',
        minHeight: 44,
        cursor: 'pointer',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent-light)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-sec3)')}
    >
      {children}
    </button>
  );
}

function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
