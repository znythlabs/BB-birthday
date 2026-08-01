"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

import { UnderwaterScene } from "@/components/underwater/UnderwaterScene";
import { eventDetails } from "@/data/eventDetails";
import {
  createRafVideoSeeker,
  scrollProgressToTime,
} from "@/lib/scrollVideo.mjs";

export function WelcomeDiveSequence({
  adventureStarted,
  onStartAdventure,
}: {
  adventureStarted: boolean;
  onStartAdventure: () => void;
}) {
  const triggerRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<HTMLVideoElement>(null);
  const transitionRef = useRef<HTMLVideoElement>(null);
  const underwaterRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [underwaterActive, setUnderwaterActive] = useState(false);

  useEffect(() => {
    const video = transitionRef.current;
    if (!video) return;

    const syncMetadata = () => {
      const clipDuration = video.duration;
      video.pause();
      video.currentTime = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
        ? scrollProgressToTime(1, clipDuration)
        : 0;
      setDuration(clipDuration);
    };

    if (video.readyState >= 1) {
      syncMetadata();
      return;
    }

    video.addEventListener("loadedmetadata", syncMetadata, { once: true });
    return () =>
      video.removeEventListener("loadedmetadata", syncMetadata);
  }, []);

  useEffect(() => {
    const trigger = triggerRef.current;
    const pin = pinRef.current;
    const island = islandRef.current;
    const transition = transitionRef.current;
    const underwater = underwaterRef.current;
    const content = contentRef.current;
    const shade = shadeRef.current;
    if (
      !trigger ||
      !pin ||
      !island ||
      !transition ||
      !underwater ||
      !content ||
      !shade ||
      duration <= 0
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    transition.pause();

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const seeker = createRafVideoSeeker(transition);

      const applyProgress = (progress: number) => {
        const transitionMix = Math.min(1, progress / 0.08);
        const copyExit = Math.min(1, progress / 0.1);
        const underwaterHandoff = Math.min(
          1,
          Math.max(0, (progress - 0.9) / 0.1),
        );

        // Hold transition's final frame while underwater scene crossfades over it.
        seeker.seek(scrollProgressToTime(Math.min(1, progress / 0.9), duration));
        setUnderwaterActive((active) => underwaterHandoff > 0 || active);
        // Keep lower layer opaque; fading both layers creates a dark midpoint.
        gsap.set(island, { opacity: 1 });
        gsap.set(transition, { opacity: transitionMix });
        gsap.set(underwater, { opacity: underwaterHandoff });
        gsap.set(shade, { opacity: 1 - underwaterHandoff });
        gsap.set(content, {
          opacity: 1 - copyExit,
          yPercent: -18 * copyExit,
        });
      };

      const context = gsap.context(() => {
        ScrollTrigger.create({
          trigger,
          start: "top top",
          end: () => `+=${window.innerHeight * 3.5}`,
          pin: pin,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => applyProgress(self.progress),
          onRefresh: (self) => applyProgress(self.progress),
        });
      }, trigger);

      applyProgress(0);
      ScrollTrigger.refresh();

      return () => {
        seeker.cancel();
        context.revert();
      };
    });

    return () => media.revert();
  }, [duration]);

  return (
    <section
      ref={triggerRef}
      className="welcome-dive-sequence"
      aria-labelledby="welcome-title"
    >
      <div ref={pinRef} className="welcome-dive-pin">
        <video
          ref={islandRef}
          className="welcome-dive-island"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/images/underwater/island.mp4" type="video/mp4" />
        </video>

        <video
          ref={transitionRef}
          className="welcome-dive-transition"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source
            src="/images/underwater/transition-scrub-smooth.mp4"
            type="video/mp4"
          />
          <source src="/images/underwater/transition.mp4" type="video/mp4" />
        </video>

        <div ref={underwaterRef} className="welcome-dive-underwater">
          <UnderwaterScene active={underwaterActive} />
        </div>

        <div ref={shadeRef} className="welcome-shade" aria-hidden="true" />

        <div ref={contentRef} className="welcome-dive-content">
          <div className="welcome-copy">
            <h1 id="welcome-title" aria-label={eventDetails.title}>
              <span>Liliana’s</span>
              <span>First Birthday</span>
            </h1>
            <p>{eventDetails.invitationMessage}</p>
            {!adventureStarted ? (
              <button type="button" className="start-adventure-button" onClick={onStartAdventure}>
                Start the adventure
              </button>
            ) : null}
          </div>

          <div className="welcome-scroll-cue" aria-hidden="true">
            <span>Scroll to dive</span>
            <i />
          </div>
        </div>
      </div>
    </section>
  );
}
