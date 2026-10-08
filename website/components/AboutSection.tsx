export default function AboutSection() {
  return (
    <section
      id="s-about"
      data-screen-label="02 About"
      style={{
        overflowX: 'clip',
        minHeight: '90svh',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12vh var(--section-pad-x)',
      }}
    >
      <div style={{ position: 'relative', isolation: 'isolate', maxWidth: 600 }}>
        {/* Readability halo */}
        <div aria-hidden style={{
          position: 'absolute',
          inset: '-14vh -18vw',
          background: 'var(--halo)',
          pointerEvents: 'none',
          zIndex: -1,
        }} />

        <p style={{
          margin: 0,
          fontFamily: 'var(--font-heading)',
          fontWeight: 500,
          fontSize: 'clamp(26px,3.2vw,36px)',
          lineHeight: 1.32,
          color: 'var(--color-text-head)',
          textWrap: 'pretty',
          textShadow: 'var(--text-shadow)',
        }}>
          When your mind won&rsquo;t sit still, give it something to do. Humming and toning vibrate your throat and chest, right where the vagus nerve runs, helping your body shift out of stress and back into calm. Ten minutes, guided or on your own, and your voice joins something bigger: harmonies that answer you, and soundscapes drawn from the movement of the cosmos.
        </p>
      </div>
    </section>
  );
}
