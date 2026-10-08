'use client';

interface Props {
  soundOn: boolean;
  onToggleSound: () => void;
}

export default function SiteHeader({ soundOn, onToggleSound }: Props) {
  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '16px var(--page-pad-x)',
    }}>
      {/* Logotype */}
      <span style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 500,
        fontSize: 22,
        color: 'var(--color-text)',
        letterSpacing: '-0.01em',
      }}>
        Cosmic Picnic
      </span>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Sound toggle */}
        <button
          onClick={onToggleSound}
          aria-label={soundOn ? 'Mute' : 'Unmute'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            minHeight: 44,
            background: 'transparent',
            color: 'var(--color-text)',
            border: '1px solid rgba(255,230,180,0.3)',
            borderRadius: 999,
            padding: 0,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,230,180,0.3)')}
        >
          {soundOn ? <IconVolume /> : <IconVolumeMuted />}
        </button>

        {/* Join the beta — solid gold pill */}
        <a
          href="#join"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--color-accent)',
            color: '#0a1033',
            border: '1px solid var(--color-accent)',
            borderRadius: 999,
            padding: '0 18px',
            minHeight: 44,
            font: '500 15px var(--font-body)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--color-accent-light)';
            e.currentTarget.style.borderColor = 'var(--color-accent-light)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--color-accent)';
            e.currentTarget.style.borderColor = 'var(--color-accent)';
          }}
          onMouseDown={e => {
            e.currentTarget.style.background = 'var(--color-accent-press)';
            e.currentTarget.style.borderColor = 'var(--color-accent-press)';
          }}
          onMouseUp={e => {
            e.currentTarget.style.background = 'var(--color-accent-light)';
            e.currentTarget.style.borderColor = 'var(--color-accent-light)';
          }}
        >
          Join the beta
        </a>
      </div>
    </header>
  );
}

// ── Inline SVGs (Lucide volume-2 / volume-x, 16×16, stroke 1.5) ──────────

function IconVolume() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z" />
      <path d="M16 9a5 5 0 0 1 0 6" />
      <path d="M19.4 18.4a9 9 0 0 0 0-12.7" />
    </svg>
  );
}

function IconVolumeMuted() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}
