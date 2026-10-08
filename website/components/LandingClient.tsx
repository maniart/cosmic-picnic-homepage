'use client';

import { useRef, useState, useCallback } from 'react';
import { useAudio } from '@/hooks/useAudio';
import SceneCanvas, { type SceneHandle } from './SceneCanvas';
import SiteHeader from './SiteHeader';
import HeroSection from './HeroSection';
import AboutSection from './AboutSection';
import HowItWorksSection from './HowItWorksSection';
import WhyYourVoiceSection from './WhyYourVoiceSection';
import JoinSection from './JoinSection';
import TasteFlow from './TasteFlow';
import SectionNav from './SectionNav';

export default function LandingClient() {
  const audio         = useAudio();
  const sceneRef      = useRef<SceneHandle>(null);
  const signedUpEmail = useRef('');
  const [tasteFlowOpen, setTasteFlowOpen] = useState(false);

  // First canvas click → boot the drone + opening chime + ripple
  const handleFirstInteraction = useCallback(() => {
    audio.startAmbient();
    sceneRef.current?.pulse();
  }, [audio]);

  // Subsequent canvas clicks → chime (when sound is on)
  const handleChime = useCallback(() => {
    if (audio.soundOn) audio.chime();
  }, [audio]);

  // After a successful sign-up → store email, ripple + open taste flow
  const handleSignUp = useCallback((email: string) => {
    signedUpEmail.current = email;
    sceneRef.current?.spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
    setTasteFlowOpen(true);
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <SceneCanvas
        ref={sceneRef}
        soundOn={audio.soundOn}
        audioStarted={audio.audioStarted}
        onFirstInteraction={handleFirstInteraction}
        onChime={handleChime}
      />

      <SiteHeader
        soundOn={audio.soundOn}
        onToggleSound={audio.toggleSound}
      />

      <main style={{ position: 'relative', zIndex: 1 }}>
        <HeroSection />
        <AboutSection />
        <HowItWorksSection />
        <WhyYourVoiceSection />
        <JoinSection onSignUp={handleSignUp} />
      </main>

      <SectionNav />

      <TasteFlow
        open={tasteFlowOpen}
        onClose={() => setTasteFlowOpen(false)}
        audio={audio}
        email={signedUpEmail.current}
      />
    </div>
  );
}
