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
import { enterMobileFullscreen, isIos, isIphoneLike } from "@/lib/mobileFullscreen";

const IOS_TRANSITION_ATLASES = Array.from(
  { length: 8 },
  (_, index) => `/images/mobile/transition-ios-atlas/transition-ios-${String(index + 1).padStart(2, "0")}.webp`,
);

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
  const iosTransitionRef = useRef<HTMLDivElement>(null);
  const underwaterRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [iosTransitionMode, setIosTransitionMode] = useState<boolean | null>(null);
  const [underwaterActive, setUnderwaterActive] = useState(false);
  const [needsManualRotation, setNeedsManualRotation] = useState(false);
  const committedRef = useRef(false);
  const iosAtlasImagesRef = useRef<HTMLImageElement[]>([]);

  // iPhone Safari/Chrome cannot auto-enter fullscreen or lock orientation, so
  // the rotate prompt should greet iPhone users immediately on load (portrait).
  useEffect(() => {
    if (window.matchMedia("(max-width: 1200px)").matches && isIphoneLike()) {
      setNeedsManualRotation(true);
    }
  }, []);

  useEffect(() => {
    const ios = isIos();
    setIosTransitionMode(ios);
    if (!ios) return;
    setDuration(8.066667);
    iosAtlasImagesRef.current = IOS_TRANSITION_ATLASES.map((src) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      void image.decode().catch(() => undefined);
      return image;
    });
    return () => {
      iosAtlasImagesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (iosTransitionMode !== false) return;
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

    video.addEventListener("loadedmetadata", syncMetadata, { once: true });
    video.load();
    if (video.readyState >= 1) syncMetadata();
    return () => video.removeEventListener("loadedmetadata", syncMetadata);
  }, [iosTransitionMode]);

  useEffect(() => {
    const trigger = triggerRef.current;
    const pin = pinRef.current;
    const island = islandRef.current;
    const transition = transitionRef.current;
    const iosTransition = iosTransitionRef.current;
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
    const iosDevice = isIos();

    const refreshTrigger = () => {
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--fullscreen-height", `${window.innerHeight}px`);
        ScrollTrigger.refresh();
      });
    };
    window.addEventListener("resize", refreshTrigger);
    window.addEventListener("orientationchange", refreshTrigger);
    document.addEventListener("fullscreenchange", refreshTrigger);

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const seeker = createRafVideoSeeker(transition);

      const applyProgress = (progress: number) => {
        if (committedRef.current) progress = 1;
        const transitionMix = Math.min(1, progress / 0.08);
        const copyExit = Math.min(1, progress / 0.1);
        const underwaterHandoff = Math.min(
          1,
          Math.max(0, (progress - 0.9) / 0.1),
        );

        // Safari's paused-video seeking can show only the stacking background.
        // iOS scrubs a lightweight 15fps sprite atlas; other platforms keep the MP4 seeker.
        const scrubProgress = Math.min(1, progress / 0.9);
        if (iosDevice && iosTransition) {
          const frame = Math.min(120, Math.floor(scrubProgress * 120));
          const sheet = Math.floor(frame / 16) + 1;
          const tile = frame % 16;
          iosTransition.style.backgroundImage = `url(${IOS_TRANSITION_ATLASES[sheet - 1]})`;
          iosTransition.style.backgroundPosition = `${(tile % 4) * (100 / 3)}% ${Math.floor(tile / 4) * (100 / 3)}%`;
        } else {
          seeker.seek(scrollProgressToTime(scrubProgress, duration));
        }
        setUnderwaterActive((active) => underwaterHandoff > 0 || active);
        // Keep the island painted beneath the scrub. Safari can defer a paused
        // video's first decoded frame; the island prevents a blue gap meanwhile.
        gsap.set(island, { opacity: 1 });
        gsap.set(transition, { opacity: iosDevice ? 0 : transitionMix });
        if (iosTransition) gsap.set(iosTransition, { opacity: iosDevice ? transitionMix : 0 });
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
          onUpdate: (self) => {
            if (committedRef.current) return;
            applyProgress(self.progress);
            if (
              self.progress >= 0.9 &&
              window.matchMedia("(max-width: 1200px)").matches
            ) {
              applyProgress(1);
              committedRef.current = true;
              pin.dataset.underwaterCommitted = "true";
              self.disable(false);
              underwater.style.pointerEvents = "auto";
              document.documentElement.classList.add("mobile-underwater-locked");
              document.body.classList.add("mobile-underwater-locked");
            }
          },
          onRefresh: (self) => {
            if (!committedRef.current) applyProgress(self.progress);
          },
        });
      }, trigger);

      applyProgress(0);
      ScrollTrigger.refresh();

      return () => {
        seeker.cancel();
        context.revert();
      };
    });

    return () => {
      window.removeEventListener("resize", refreshTrigger);
      window.removeEventListener("orientationchange", refreshTrigger);
      document.removeEventListener("fullscreenchange", refreshTrigger);
      document.documentElement.style.removeProperty("--fullscreen-height");
      pin.removeAttribute("data-underwater-committed");
      document.documentElement.classList.remove("mobile-underwater-locked");
      document.body.classList.remove("mobile-underwater-locked");
      media.revert();
    };
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
          <source
            media="(max-width: 1200px)"
            src="/images/mobile/island-mobile.mp4"
            type="video/mp4"
          />
          <source src="/images/underwater/island.mp4" type="video/mp4" />
        </video>

        <div
          ref={iosTransitionRef}
          className="welcome-dive-transition-ios"
          aria-hidden="true"
        />

        <video
          ref={transitionRef}
          className="welcome-dive-transition"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        >
          {iosTransitionMode === false ? (
            <>
              <source
                media="(max-width: 1200px)"
                src="/images/mobile/transition-scrub-mobile.mp4"
                type="video/mp4"
              />
              <source
                src="/images/underwater/transition-scrub-smooth.mp4"
                type="video/mp4"
              />
              <source src="/images/underwater/transition.mp4" type="video/mp4" />
            </>
          ) : null}
        </video>

        <div ref={underwaterRef} className="welcome-dive-underwater">
          <UnderwaterScene active={underwaterActive} />
        </div>

        <div ref={shadeRef} className="welcome-shade" aria-hidden="true" />

        <div ref={contentRef} className="welcome-dive-content">
          <div className="welcome-copy">
            <h1 id="welcome-title" aria-label={eventDetails.title}>
              <span>Lilianna’s</span>
              <span>First Birthday</span>
            </h1>
            <p>{eventDetails.invitationMessage}</p>
            {!adventureStarted ? (
              <button
                type="button"
                className="start-adventure-button"
                onClick={() => {
                  if (window.matchMedia("(max-width: 1200px)").matches) {
                    if (isIphoneLike()) setNeedsManualRotation(true);
                    void enterMobileFullscreen();
                  } else if (!document.fullscreenElement) {
                    void document.documentElement
                      .requestFullscreen({ navigationUI: "hide" })
                      .catch(() => undefined);
                  }
                  onStartAdventure();
                }}
              >
                Start the adventure
              </button>
            ) : null}
          </div>

          <div className="welcome-scroll-cue" aria-hidden="true">
            <span>Scroll to dive</span>
            <i />
          </div>
        </div>

        {needsManualRotation && !underwaterActive ? (
          <div className="welcome-rotate-prompt" role="status">
            <span className="rotate-device-icon" aria-hidden="true">↻</span>
            <strong>Rotate your iPhone</strong>
            <span>Turn your phone sideways to continue the adventure in landscape.</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
