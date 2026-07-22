"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

import { scrollProgressToTime } from "@/lib/scrollVideo.mjs";

export function ScrollDiveTransition() {
  const triggerRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncMetadata = () => {
      const clipDuration = video.duration;
      video.pause();
      video.currentTime = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? scrollProgressToTime(1, clipDuration)
        : 0;
      setDuration(clipDuration);
    };

    if (video.readyState >= 1) {
      syncMetadata();
      return;
    }

    video.addEventListener("loadedmetadata", syncMetadata, { once: true });
    return () => video.removeEventListener("loadedmetadata", syncMetadata);
  }, []);

  useEffect(() => {
    const trigger = triggerRef.current;
    const pin = pinRef.current;
    const video = videoRef.current;
    if (!trigger || !pin || !video || duration <= 0) return;

    gsap.registerPlugin(ScrollTrigger);
    video.pause();

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          video,
          { currentTime: 0 },
          {
            currentTime: scrollProgressToTime(1, duration),
            ease: "none",
            scrollTrigger: {
              trigger,
              start: "top top",
              end: () => `+=${window.innerHeight * 3.5}`,
              scrub: 0.15,
              pin: pin,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          },
        );
      }, trigger);

      ScrollTrigger.refresh();
      return () => context.revert();
    });

    return () => media.revert();
  }, [duration]);

  return (
    <section ref={triggerRef} className="scroll-dive-transition" aria-hidden="true">
      <div ref={pinRef} className="scroll-dive-pin">
        <video
          ref={videoRef}
          className="transition-video"
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
        >
          <source src="/images/underwater/transition-scrub.mp4" type="video/mp4" />
          <source src="/images/underwater/transition.mp4" type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
