const STEPS = [
  {
    label: 'Pick your companion.',
    body: 'A crystal singing bowl, a setâr, or a soundscape generated from NASA space data.',
  },
  {
    label: 'Tone along.',
    body: 'Follow a guide in your headphones, or go on your own.',
  },
  {
    label: 'Hear yourself answered.',
    body: 'Your voice shapes harmony, gentle haptics and a glowing avatar, in real time.',
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="s-how"
      data-screen-label="03 How it works"
      style={{
        overflowX: 'clip',
        minHeight: '100svh',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12vh var(--section-pad-x)',
      }}
    >
      <div style={{ position: 'relative', isolation: 'isolate', width: '100%', maxWidth: 560 }}>
        {/* Readability halo */}
        <div aria-hidden style={{
          position: 'absolute',
          inset: '-14vh -18vw',
          background: 'var(--halo)',
          pointerEvents: 'none',
          zIndex: -1,
        }} />

        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 400,
          fontSize: 'clamp(36px,4.4vw,56px)',
          lineHeight: 1,
          margin: '0 0 28px',
          textShadow: 'var(--text-shadow)',
        }}>
          How it works
        </h2>

        <ol style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          borderTop: '1px solid var(--color-hairline-list)',
        }}>
          {STEPS.map((step, i) => (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px minmax(0,1fr)',
                gap: 8,
                padding: '22px 0',
                borderBottom: '1px solid var(--color-hairline-list)',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 26,
                lineHeight: 1.1,
                color: 'var(--color-accent-numeral)',
                fontFeatureSettings: "'tnum'",
                textShadow: 'var(--text-shadow)',
              }}>
                {i + 1}
              </span>
              <p style={{
                margin: 0,
                fontSize: 18,
                lineHeight: 1.6,
                color: 'var(--color-text-sec2)',
                textWrap: 'pretty',
                textShadow: 'var(--text-shadow)',
              }}>
                <strong style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                  {step.label}
                </strong>{' '}
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
