'use client';

import { useEffect, useRef, useState } from 'react';

// ── Section registry ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 's-hero',  label: 'Meditate out loud' },
  { id: 's-about', label: 'About'             },
  { id: 's-how',   label: 'How it works'      },
  { id: 's-why',   label: 'Why your voice'    },
  { id: 'join',    label: 'Join the beta'      },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function SectionNav() {
  const [active,   setActive]   = useState(0);
  const [wide,     setWide]     = useState(true);
  const [navHover, setNavHover] = useState(false);
  const progFillRef             = useRef<HTMLDivElement>(null);
  const reduced                 = useRef(false);

  useEffect(() => {
    reduced.current =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onScroll = () => {
      const se  = document.scrollingElement ?? document.documentElement;
      const max = Math.max(1, se.scrollHeight - window.innerHeight);
      const mid = window.innerHeight / 2;

      // Active section: last one whose top is above the midpoint
      let a = 0;
      SECTIONS.forEach((sec, i) => {
        const el = document.getElementById(sec.id);
        if (el && el.getBoundingClientRect().top <= mid) a = i;
      });
      // Snap to last section when scrolled to the very bottom
      if (se.scrollTop + window.innerHeight >= se.scrollHeight - 4) {
        a = SECTIONS.length - 1;
      }

      // Update progress bar directly (no re-render)
      if (progFillRef.current) {
        progFillRef.current.style.transform =
          `scaleY(${Math.min(1, se.scrollTop / max).toFixed(4)})`;
      }

      setActive(prev => (prev !== a ? a : prev));
    };

    const onResize = () => {
      setWide(window.innerWidth >= 760);
      onScroll();
    };

    // Initial state
    setWide(window.innerWidth >= 760);
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const goTo = (i: number) => {
    const el = document.getElementById(SECTIONS[i].id);
    if (!el) return;
    window.scrollTo({
      top:      el.getBoundingClientRect().top + window.scrollY,
      behavior: reduced.current ? 'auto' : 'smooth',
    });
  };

  return (
    <>
      {/* ── Mobile progress bar (<760 px) ──────────────────────────────────── */}
      {!wide && (
        <div
          aria-hidden
          style={{
            position:   'fixed',
            right:      0,
            top:        0,
            bottom:     0,
            width:      2,
            zIndex:     9,
            background: 'rgba(255,230,180,0.12)',
          }}
        >
          <div
            ref={progFillRef}
            style={{
              position:        'absolute',
              inset:           0,
              background:      '#e1ad66',
              transformOrigin: 'top',
              transform:       'scaleY(0)',
            }}
          />
        </div>
      )}

      {/* ── Desktop dot nav (≥760 px) ───────────────────────────────────────── */}
      {wide && (
        <nav
          aria-label="Sections"
          onMouseEnter={() => setNavHover(true)}
          onMouseLeave={() => setNavHover(false)}
          onFocus={()     => setNavHover(true)}
          onBlur={()      => setNavHover(false)}
          style={{
            position:  'fixed',
            right:     'clamp(8px, 2.4vw, 32px)',
            top:       '50%',
            transform: 'translateY(-50%)',
            zIndex:    9,
          }}
        >
          {/* Vertical hairline */}
          <div
            aria-hidden
            style={{
              position:   'absolute',
              right:      21,
              top:        16,
              bottom:     16,
              width:      1,
              background: 'rgba(255,230,180,0.2)',
            }}
          />

          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SECTIONS.map((sec, i) => {
              const cur = i === active;
              return (
                <li key={sec.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => goTo(i)}
                    aria-label={sec.label}
                    aria-current={cur ? 'step' : undefined}
                    style={{
                      position:   'relative',
                      display:    'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap:        12,
                      minHeight:  32,
                      padding:    0,
                      background: 'transparent',
                      border:     'none',
                      cursor:     'pointer',
                      font:       `400 13px var(--font-body)`,
                      color:      cur ? '#facb8d' : '#d9cfb8',
                      transition: 'color .4s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#facb8d')}
                    onMouseLeave={e => (e.currentTarget.style.color = cur ? '#facb8d' : '#d9cfb8')}
                  >
                    {/* Label */}
                    <span style={{
                      whiteSpace:  'nowrap',
                      opacity:     cur ? 1 : navHover ? 0.75 : 0,
                      transition:  'opacity .4s ease',
                      textShadow:  '0 0 12px #050820',
                    }}>
                      {sec.label}
                    </span>

                    {/* Touch-target + dot */}
                    <span style={{
                      width:       44,
                      height:      32,
                      display:     'flex',
                      alignItems:  'center',
                      justifyContent: 'center',
                      flexShrink:  0,
                    }}>
                      <span style={{
                        width:        cur ? 13 : 7,
                        height:       cur ? 13 : 7,
                        borderRadius: '50%',
                        boxSizing:    'border-box',
                        border:       `1px solid ${cur ? '#e1ad66' : 'rgba(255,230,180,0.55)'}`,
                        background:   cur ? 'rgba(225,173,102,0.25)' : '#0a1238',
                        transition:   'all .4s ease',
                        display:      'block',
                      }} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </>
  );
}
