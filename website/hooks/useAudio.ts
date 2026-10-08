import { useRef, useState, useCallback } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────
const DRONE_LEVEL    = 0.8;
const PRACTICE_LEVEL = 1.25;

// Venus tone base frequency (A3 ≈ 221.23 Hz)
const VENUS = 221.23;

// Just-ratio options for click chime pitch
const JUST_RATIOS = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];

// ── Shared audio graph (one instance per page) ───────────────────────────────
interface AudioCore {
  ctx:     AudioContext;
  out:     GainNode;   // final output — muted by toggle
  master:  GainNode;   // drone bus (gain 0 → 0.8)
  fx:      GainNode;   // FX send — delay chain feeds out
  droneOn: boolean;
  pBus:    GainNode | null; // practice bus (bowl + breath chimes)
}

// ── Public API returned by the hook ─────────────────────────────────────────
export interface AudioAPI {
  soundOn:      boolean;
  audioStarted: boolean;
  /** Starts the drone. Pass ring=false to suppress the opening chime (practice start). */
  startAmbient: (ring?: boolean) => void;
  /** Plays a random click chime (call only when soundOn && audioStarted). */
  chime: () => void;
  /** Mutes/unmutes the whole engine. */
  toggleSound: () => void;
  /** Play an inhale or exhale breath chime during practice. */
  breathChime: (kind: 'in' | 'out') => void;
  /** Strike the singing bowl (practice start). */
  strikeBowl:  () => void;
  /** Fade out and disconnect the practice bus; clear practice timers. */
  stopPractice: () => void;
  /** Ramp master gain up for practice (1.25) or back down (0.8). */
  setPracticeLevel: (active: boolean) => void;
  /** Whether the engine is currently in practice (guards breath chimes). */
  inPracticeRef: React.MutableRefObject<boolean>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAudio(): AudioAPI {
  const [soundOn,      setSoundOn]      = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  // Mirrors of state values accessible from stale closures
  const soundOnRef   = useRef(false);
  const inPractice   = useRef(false);
  const audioRef     = useRef<AudioCore | null>(null);

  // ── ensureAudio ────────────────────────────────────────────────────────────
  // Lazily creates the AudioContext and the shared signal graph.
  const ensureAudio = useCallback((): AudioCore | null => {
    if (audioRef.current) {
      if (audioRef.current.ctx.state === 'suspended') audioRef.current.ctx.resume();
      return audioRef.current;
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;

    const ctx = new AC();
    // out → destination (controls overall mute)
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(ctx.destination);

    // master → out (drone level, starts silent)
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(out);

    // FX bus: fx → delay → lp → (feedback loop) + wet → out
    const fx    = ctx.createGain();
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const fb  = ctx.createGain();
    fb.gain.value = 0.5;
    const lp  = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    fx.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay); // feedback
    lp.connect(wet);
    wet.connect(out);
    fx.connect(out);   // dry signal through as well

    const core: AudioCore = { ctx, out, master, fx, droneOn: false, pBus: null };
    audioRef.current = core;
    return core;
  }, []);

  // ── practiceBus ───────────────────────────────────────────────────────────
  // Lazily creates a gain node for bowl + breath chimes.
  const practiceBus = useCallback((): GainNode | null => {
    const a = audioRef.current;
    if (!a) return null;
    if (!a.pBus) {
      a.pBus = a.ctx.createGain();
      a.pBus.connect(a.fx);
    }
    return a.pBus;
  }, []);

  // ── startAmbient ──────────────────────────────────────────────────────────
  // Creates the five-oscillator drone with slow LFOs and ramps master to 0.8.
  const startAmbient = useCallback((ring = true) => {
    const a = ensureAudio();
    if (!a) return;

    if (!a.droneOn) {
      const { ctx, master } = a;

      // Lowpass at 700 Hz, swept by a 0.03 Hz LFO ±350 Hz
      const droneF = ctx.createBiquadFilter();
      droneF.type = 'lowpass';
      droneF.frequency.value = 700;
      droneF.connect(master);

      const sw = ctx.createOscillator();
      sw.frequency.value = 0.03;
      const sg = ctx.createGain();
      sg.gain.value = 350;
      sw.connect(sg);
      sg.connect(droneF.frequency);
      sw.start();

      // Five partials — sines and triangles on the Om/Earth tone
      (
        [
          [68.05,  'sine',     0.090],
          [136.1,  'triangle', 0.035],
          [204.15, 'sine',     0.025],
          [91.79,  'sine',     0.050],
          [183.58, 'triangle', 0.018],
        ] as [number, OscillatorType, number][]
      ).forEach(([freq, type, gv], i) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.detune.value = (Math.random() - 0.5) * 6; // tiny humanise

        const g = ctx.createGain();
        g.gain.value = gv;

        // Per-oscillator LFO on gain
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.04 + i * 0.023;
        const lg = ctx.createGain();
        lg.gain.value = gv * 0.8;
        lfo.connect(lg);
        lg.connect(g.gain);

        o.connect(g);
        g.connect(droneF);
        o.start();
        lfo.start();
      });

      a.droneOn = true;
    }

    // Ramp master up over 1.2 s
    const level = inPractice.current ? PRACTICE_LEVEL : DRONE_LEVEL;
    a.master.gain.setTargetAtTime(level, a.ctx.currentTime, 1.2);

    setSoundOn(true);
    soundOnRef.current = true;
    setAudioStarted(true);

    // Opening chime (deferred slightly so context is definitely running)
    if (ring) setTimeout(() => chime(), 80);

    // Resume-on-gesture hook (in case autoplay was deferred)
    if (a.ctx.state === 'suspended') {
      const resume = () => {
        a.ctx.resume();
        document.removeEventListener('pointerdown', resume, true);
        document.removeEventListener('keydown',     resume, true);
      };
      document.addEventListener('pointerdown', resume, true);
      document.addEventListener('keydown',     resume, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureAudio]);

  // ── chime ─────────────────────────────────────────────────────────────────
  // Three-partial bell at a random Venus-tone just interval.
  const chime = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    const { ctx, fx } = a;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const ratio = JUST_RATIOS[Math.floor(Math.random() * JUST_RATIOS.length)];
    const oct   = Math.random() < 0.5 ? 1 : 2;
    const f     = VENUS * ratio * oct;

    ([
      [1,     0.16, 3.2],
      [2.756, 0.05, 1.4],
      [5.404, 0.02, 0.7],
    ] as [number, number, number][]).forEach(([m, gv, dur]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * m;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gv, now + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g);
      g.connect(fx);
      o.start(now);
      o.stop(now + dur + 0.1);
    });
  }, []);

  // ── toggleSound ───────────────────────────────────────────────────────────
  const toggleSound = useCallback(() => {
    const a = audioRef.current;

    // First interaction — boot the engine instead of toggling
    if (!a) {
      startAmbient();
      return;
    }

    const next = !soundOnRef.current;
    const targetLevel = next
      ? (inPractice.current ? PRACTICE_LEVEL : DRONE_LEVEL)
      : 0;
    a.master.gain.setTargetAtTime(targetLevel, a.ctx.currentTime, 0.4);

    soundOnRef.current = next;
    setSoundOn(next);
  }, [startAmbient]);

  // ── breathChime ───────────────────────────────────────────────────────────
  // 272.2 Hz (in) or 204.15 Hz (out) — harmonics of the 136.1 Hz Om tone.
  const breathChime = useCallback((kind: 'in' | 'out') => {
    const a = audioRef.current;
    if (!a || !soundOnRef.current || !inPractice.current) return;
    const { ctx } = a;
    const bus = practiceBus();
    if (!bus) return;
    const now = ctx.currentTime;
    const f   = kind === 'in' ? 272.2 : 204.15;

    ([
      [1,     0.11,  4.5],
      [2.756, 0.025, 1.8],
      [5.404, 0.008, 0.8],
    ] as [number, number, number][]).forEach(([m, gv, dur]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * m;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gv, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g);
      g.connect(bus);
      o.start(now);
      o.stop(now + dur + 0.1);
    });
  }, [practiceBus]);

  // ── strikeBowl ────────────────────────────────────────────────────────────
  // Synthesised singing bowl (5 partials, 12 s decay). Swap bowlSrc for a
  // real recording once it arrives.
  const strikeBowl = useCallback(() => {
    const a = ensureAudio();
    if (!a) return;
    const { ctx } = a;
    const bus = practiceBus();
    if (!bus) return;
    const now = ctx.currentTime;
    const f   = VENUS; // 221.23 Hz

    ([
      [1,     0.20, 12],
      [1.004, 0.12, 11],
      [2.71,  0.07,  8],
      [5.12,  0.03,  5],
      [8.3,   0.012, 3],
    ] as [number, number, number][]).forEach(([m, gv, dur]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * m;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gv, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g);
      g.connect(bus);
      o.start(now);
      o.stop(now + dur + 0.1);
    });
  }, [ensureAudio, practiceBus]);

  // ── stopPractice ──────────────────────────────────────────────────────────
  // Fade and disconnect the practice bus. Caller is responsible for clearing
  // timers (setInterval/setTimeout) from the TasteFlow component.
  const stopPractice = useCallback(() => {
    inPractice.current = false;
    const a = audioRef.current;
    if (!a?.pBus) return;
    const old = a.pBus;
    old.gain.setTargetAtTime(0, a.ctx.currentTime, 0.08);
    setTimeout(() => old.disconnect(), 600);
    a.pBus = null;
  }, []);

  // ── setPracticeLevel ──────────────────────────────────────────────────────
  // Ramp master gain to 1.25 when practice starts, 0.8 when it ends.
  const setPracticeLevel = useCallback((active: boolean) => {
    inPractice.current = active;
    const a = audioRef.current;
    if (!a || !soundOnRef.current) return;
    const target = active ? PRACTICE_LEVEL : DRONE_LEVEL;
    a.master.gain.setTargetAtTime(target, a.ctx.currentTime, active ? 1.2 : 2.0);
  }, []);

  return {
    soundOn,
    audioStarted,
    startAmbient,
    chime,
    toggleSound,
    breathChime,
    strikeBowl,
    stopPractice,
    setPracticeLevel,
    inPracticeRef: inPractice,
  };
}
