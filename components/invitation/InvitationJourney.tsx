"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";

import { WelcomeDiveSequence } from "./WelcomeDiveSequence";

export function InvitationJourney() {
  const [audioMuted, setAudioMuted] = useState(true);
  const [adventureStarted, setAdventureStarted] = useState(false);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const cursorTrailRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const setVisible = (visible: boolean) => {
      cursorRef.current?.toggleAttribute("data-visible", visible);
      cursorTrailRef.current?.toggleAttribute("data-visible", visible);
    };
    const moveCursor = (event: MouseEvent) => {
      const transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      if (cursorRef.current) cursorRef.current.style.transform = transform;
      if (cursorTrailRef.current) cursorTrailRef.current.style.transform = transform;
      setVisible(true);
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setVisible(false), 2000);
    };
    const hideCursor = () => setVisible(false);
    window.addEventListener("mousemove", moveCursor);
    document.documentElement.addEventListener("mouseleave", hideCursor);
    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.documentElement.removeEventListener("mouseleave", hideCursor);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);

  useEffect(() => {
    const syncAudioState = (event: Event) => setAudioMuted((event as CustomEvent<{ muted: boolean }>).detail.muted);
    window.addEventListener("invitation-audio-state", syncAudioState);
    return () => window.removeEventListener("invitation-audio-state", syncAudioState);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({
      autoRaf: false,
      smoothWheel: true,
      syncTouch: false,
      lerp: 0.1,
    });
    const tick = (time: number) => lenis.raf(time * 1000);

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <main className="invitation-journey">
      <span ref={cursorTrailRef} className="game-cursor-trail global-game-cursor" aria-hidden="true" />
      <span ref={cursorRef} className="game-cursor-dot global-game-cursor" aria-hidden="true" />
      <button
        type="button"
        className="global-audio-toggle"
        aria-label={`${audioMuted ? "Enable" : "Mute"} website sound`}
        onClick={() => window.dispatchEvent(new Event("invitation-audio-toggle"))}
      >
        <span aria-hidden="true">{audioMuted ? "♪" : "♫"}</span>
        {audioMuted ? "Sound on" : "Sound off"}
      </button>
      <WelcomeDiveSequence
        adventureStarted={adventureStarted}
        onStartAdventure={() => {
          window.dispatchEvent(new Event("invitation-audio-enable"));
          setAdventureStarted(true);
        }}
      />
    </main>
  );
}
