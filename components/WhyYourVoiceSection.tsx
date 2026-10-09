export default function WhyYourVoiceSection() {
  return (
    <section
      id="s-why"
      data-screen-label="04 Why your voice"
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
      <div style={{ position: 'relative', isolation: 'isolate', maxWidth: 560 }}>
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
          margin: '0 0 22px',
          textShadow: 'var(--text-shadow)',
        }}>
          Why your <em>voice</em>
        </h2>

        <p style={{
          margin: 0,
          fontSize: 18,
          lineHeight: 1.7,
          color: 'var(--color-text-sec)',
          textWrap: 'pretty',
          textShadow: 'var(--text-shadow)',
        }}>
          Silent meditation asks you to do nothing, and doing nothing is hard. Toning gives a restless mind a job and gives your body a vibration it can feel.
        </p>
      </div>
    </section>
  );
}
