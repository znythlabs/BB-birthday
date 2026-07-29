"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

import { eventDetails } from "@/data/eventDetails";
import {
  createRafVideoSeeker,
  scrollProgressToTime,
} from "@/lib/scrollVideo.mjs";

export function WelcomeDiveSequence() {
  const triggerRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<HTMLVideoElement>(null);
  const transitionRef = useRef<HTMLVideoElement>(null);
  const underwaterRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);

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
    if (
      !trigger ||
      !pin ||
      !island ||
      !transition ||
      !underwater ||
      !content ||
      duration <= 0
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    transition.pause();
    underwater.pause();
    underwater.currentTime = 0;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const seeker = createRafVideoSeeker(transition);

      const applyProgress = (progress: number) => {
        const transitionMix = Math.min(1, progress / 0.03);
        const copyExit = Math.min(1, progress / 0.1);
        const underwaterHandoff = Math.min(
          1,
          Math.max(0, (progress - 0.82) / 0.18),
        );

        seeker.seek(scrollProgressToTime(progress, duration));
        gsap.set(island, { opacity: 1 - transitionMix });
        gsap.set(transition, {
          opacity: transitionMix * (1 - underwaterHandoff),
        });
        gsap.set(underwater, { opacity: underwaterHandoff });
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
            src="/images/underwater/transition-scrub-60.mp4"
            type="video/mp4"
          />
          <source src="/images/underwater/transition.mp4" type="video/mp4" />
        </video>

        <video
          ref={underwaterRef}
          className="welcome-dive-underwater"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source
            src="/images/underwater/background-main.mp4"
            type="video/mp4"
          />
        </video>

        <div className="welcome-shade" aria-hidden="true" />

        <div ref={contentRef} className="welcome-dive-content">
          <div className="welcome-copy">
            <h1 id="welcome-title" aria-label={eventDetails.title}>
              <span>Liliana’s</span>
              <span>First Birthday</span>
            </h1>
            <p>{eventDetails.invitationMessage}</p>
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
