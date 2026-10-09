'use client';

import { useEffect, useRef, useState } from 'react';

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [arrowVisible, setArrowVisible] = useState(true);

  // Hide the down-arrow once the hero scrolls out of view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setArrowVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="s-hero"
      ref={sectionRef}
      data-screen-label="01 Hero"
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100svh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'calc(8vh + 76px) clamp(22px,6vw,96px) calc(8vh + 76px)',
      }}
    >
      {/* h1 */}
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 400,
        fontSize: 'clamp(60px,11vw,168px)',
        lineHeight: 0.9,
        letterSpacing: '-0.02em',
        margin: 0,
        textAlign: 'center',
        textWrap: 'balance',
        textShadow: 'var(--text-shadow-hero)',
        color: 'var(--color-text-head)',
      }}>
        Meditate <em>out loud.</em>
      </h1>

      {/* Divider row — tagline + CTA */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px 40px',
        marginTop: 28,
        paddingTop: 22,
        borderTop: '1px solid var(--color-hairline)',
      }}>
        <p style={{
          fontSize: 'clamp(19px,1.9vw,22px)',
          lineHeight: 1.55,
          color: 'var(--color-text)',
          maxWidth: 540,
          margin: 0,
          textWrap: 'pretty',
          textShadow: 'var(--text-shadow-hero)',
        }}>
          Cosmic Picnic is active meditation for your voice. Hum and tone, and the app listens back in sound, touch and light.
        </p>

        <a
          href="#join"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: 'transparent',
            color: 'var(--color-accent-light)',
            border: '1px solid var(--color-accent)',
            borderRadius: 999,
            padding: '14px 28px',
            minHeight: 48,
            font: '500 16px var(--font-body)',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-tint-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          onMouseDown={e  => (e.currentTarget.style.background = 'var(--color-tint-press)')}
          onMouseUp={e    => (e.currentTarget.style.background = 'var(--color-tint-hover)')}
        >
          Save my spot
        </a>
      </div>

      {/* Down-arrow — scroll to next section */}
      <a
        href="#s-about"
        aria-label="Next section"
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          border: '1px solid var(--color-hairline)',
          borderRadius: 999,
          color: 'var(--color-text-muted)',
          textDecoration: 'none',
          opacity: arrowVisible ? 1 : 0,
          transition: 'opacity 0.4s, border-color 0.15s',
          pointerEvents: arrowVisible ? 'auto' : 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-hairline)')}
      >
        <IconArrowDown />
      </a>
    </section>
  );
}

function IconArrowDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}
