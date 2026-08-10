"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { isIos } from "@/lib/mobileFullscreen";
import { clamp } from "@/lib/distance";
import {
  CRUISE_SPEED,
  FLEE_RAMP_RATE,
  FLEE_SPEED,
  GROUP_SEPARATION,
  REGROUP_SPEED,
  TURN_RATE,
  avoidanceRadius,
  fleeHeading,
  fleeSpeedBoost,
  SCHOOL_ZONES,
  isOutsideViewport,
  randomBackgroundWaypoint,
  randomSpawnPoint,
  schoolWaypoint,
  turnToward,
} from "@/lib/backgroundFish.mjs";

type Point = { x: number; y: number };
type GroupState = "cruise" | "flee" | "cooldown" | "regroup";

const FISH_VIDEOS = [
  "/images/underwater-v2/interactives/small%20fishes/opt/smallfish1-transparent.webm",
  "/images/underwater-v2/interactives/small%20fishes/opt/smallfish2-transparent.webm",
  "/images/underwater-v2/interactives/small%20fishes/opt/smallfish3-transparent.webm",
] as const;
const MOBILE_FISH_VIDEOS = [
  "/images/mobile/smallfish1-transparent-mobile.webm",
  "/images/mobile/smallfish2-transparent-mobile.webm",
  "/images/mobile/smallfish3-transparent-mobile.webm",
] as const;
const FISH_IOS_POSTERS = [
  "/images/underwater-v2/interactives/frames/keyed/smallfish1-key.webp",
  "/images/underwater-v2/interactives/frames/keyed/smallfish2-key.webp",
  "/images/underwater-v2/interactives/frames/keyed/smallfish3-key.webp",
] as const;

const MAX_TILT = 0.14;
const FLIP_DEBOUNCE_MS = 1200;
const WAYPOINT_ARRIVAL = 42;
const SCHOOL_COUNT = 2;
const SCHOOL_SIZE = FISH_VIDEOS.length;
const leaderIndexOf = (index: number) =>
  Math.floor(index / SCHOOL_SIZE) * SCHOOL_SIZE;

type GroupRuntime = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  fleeTopSpeed: number;
  state: GroupState;
  waypoint: Point | null;
  cooldownUntil: number;
  halfExtent: number;
  flip: 1 | -1;
  lastFlipAt: number;
  bobPhase: number;
};

type Props = {
  mermaidRef: RefObject<Point>;
};

export function BackgroundFishSchools({ mermaidRef }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Array<HTMLDivElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [useIosPoster, setUseIosPoster] = useState(false);

  useEffect(() => {
    setUseIosPoster(isIos());
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    let width = 0;
    let height = 0;
    let running = true;
    let rafId = 0;
    let lastFrameAt = 0;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedMotionRef = { current: motionQuery.matches };

    const isMobile = window.matchMedia("(max-width: 1200px)").matches;
    const groupCount = isMobile ? SCHOOL_SIZE : SCHOOL_COUNT * SCHOOL_SIZE;
    const groups: GroupRuntime[] = Array.from(
      { length: groupCount },
      (_, index) => ({
      x: 0,
      y: 0,
      heading: 0,
      speed: CRUISE_SPEED,
      fleeTopSpeed: FLEE_SPEED,
      state: "cruise",
      waypoint: null,
      cooldownUntil: 0,
      halfExtent: 60,
      flip: 1,
        lastFlipAt: 0,
        bobPhase: index * 1.7,
      }),
    );

    const randomizePlayback = (video: HTMLVideoElement) => {
      if (video.dataset.randomized) return;
      video.dataset.randomized = "true";
      if (video.duration > 0) video.currentTime = Math.random() * video.duration;
      video.playbackRate = 0.92 + Math.random() * 0.16;
    };
    for (const video of layer.querySelectorAll("video")) {
      if (video.readyState >= 1) randomizePlayback(video);
      else {
        // ponytail: no unmount removal needed; once-listener dies with the element
        video.addEventListener("loadedmetadata", () => randomizePlayback(video), {
          once: true,
        });
      }
    }

    const syncReducedMotion = () => {
      reducedMotionRef.current = motionQuery.matches;
      for (const video of layer.querySelectorAll("video")) {
        if (reducedMotionRef.current || document.hidden) video.pause();
        else void video.play().catch(() => undefined);
      }
    };

    const placeInitially = () => {
      groups.forEach((group, index) => {
        const leaderIndex = leaderIndexOf(index);
        const zone = SCHOOL_ZONES[Math.floor(index / SCHOOL_SIZE)];
        if (index === leaderIndex) {
          group.x =
            width *
            ((zone.minX + zone.maxX) / 2 + (Math.random() - 0.5) * 0.08);
          group.y = height * (0.16 + Math.random() * 0.28);
        } else {
          const leader = groups[leaderIndex];
          group.x = leader.x + (Math.random() - 0.5) * 160;
          group.y = leader.y + (Math.random() - 0.5) * 80;
        }
        group.waypoint = randomBackgroundWaypoint(width, height, Math.random, zone);
        group.heading = Math.atan2(
          group.waypoint.y - group.y,
          group.waypoint.x - group.x,
        );
      });
    };

    const resizeObserver = new ResizeObserver(([entry]) => {
      const firstMeasure = !width || !height;
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const fishWidth = clamp(width * 0.09, 64, 120);
      for (const group of groups) group.halfExtent = fishWidth * 0.72;
      if (firstMeasure) placeInitially();
    });
    resizeObserver.observe(layer);

    const pickWaypoint = (
      group: GroupRuntime,
      index: number,
      others: GroupRuntime[],
    ) => {
      const leaderIndex = leaderIndexOf(index);
      const next = () =>
        index === leaderIndex
          ? randomBackgroundWaypoint(
              width,
              height,
              Math.random,
              SCHOOL_ZONES[Math.floor(index / SCHOOL_SIZE)],
            )
          : schoolWaypoint(others[leaderIndex], width, height);
      let candidate = next();
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const crowded = others.some(
          (other) =>
            other !== group &&
            other.state === "cruise" &&
            Math.hypot(candidate.x - other.x, candidate.y - other.y) < GROUP_SEPARATION,
        );
        if (!crowded) break;
        candidate = next();
      }
      group.waypoint = candidate;
    };

    const applyFlip = (group: GroupRuntime, sign: 1 | -1, now: number) => {
      if (group.flip === sign || now - group.lastFlipAt < FLIP_DEBOUNCE_MS) return;
      group.flip = sign;
      group.lastFlipAt = now;
    };

    const renderGroup = (group: GroupRuntime, index: number, now: number) => {
      const element = groupRefs.current[index];
      if (!element) return;
      const bob = Math.sin(now / 1400 + group.bobPhase) * 4;
      const tilt = clamp(
        Math.atan2(Math.sin(group.heading), Math.abs(Math.cos(group.heading)) + 0.4) * 0.4,
        -MAX_TILT,
        MAX_TILT,
      );
      element.style.transform =
        `translate3d(${group.x.toFixed(1)}px, ${(group.y + bob).toFixed(1)}px, 0)` +
        ` scaleX(${group.flip}) rotate(${(tilt * group.flip).toFixed(3)}rad)`;
      element.style.visibility = group.state === "cooldown" ? "hidden" : "visible";
    };

    const frame = (now: number) => {
      if (!running) return;
      const deltaSeconds = lastFrameAt
        ? Math.min((now - lastFrameAt) / 1000, 0.05)
        : 1 / 60;
      lastFrameAt = now;

      if (width && height && !reducedMotionRef.current) {
        const mermaid = mermaidRef.current;
        const mermaidWidth = clamp(width * 0.3, 240, 380);
        const radius = avoidanceRadius(mermaidWidth);

        for (let index = 0; index < groups.length; index += 1) {
          const group = groups[index];

          if (group.state === "cooldown") {
            if (now >= group.cooldownUntil) {
              const spawn = randomSpawnPoint(width, height, group.halfExtent + 80);
              group.x = spawn.x;
              group.y = spawn.y;
              group.speed = CRUISE_SPEED;
              if (index === leaderIndexOf(index)) {
                group.state = "cruise";
                pickWaypoint(group, index, groups);
              } else {
                const leader = groups[leaderIndexOf(index)];
                group.state = "regroup";
                group.waypoint = { x: leader.x, y: leader.y };
              }
              group.heading = Math.atan2(
                group.waypoint!.y - group.y,
                group.waypoint!.x - group.x,
              );
              applyFlip(group, Math.cos(group.heading) >= 0 ? 1 : -1, now + FLIP_DEBOUNCE_MS);
              const video = videoRefs.current[index];
              if (video && !reducedMotionRef.current && !document.hidden) {
                void video.play().catch(() => undefined);
              }
            }
          } else if (group.state === "flee") {
            group.speed +=
              (group.fleeTopSpeed - group.speed) *
              (1 - Math.exp(-FLEE_RAMP_RATE * deltaSeconds));
            group.x += Math.cos(group.heading) * group.speed * deltaSeconds;
            group.y += Math.sin(group.heading) * group.speed * deltaSeconds;
            if (isOutsideViewport(group, group.halfExtent, width, height)) {
              group.state = "cooldown";
              group.cooldownUntil = now + 2500 + Math.random() * 2500;
              videoRefs.current[index]?.pause();
            }
          } else {
            const mermaidDistance = Math.hypot(
              group.x - mermaid.x,
              group.y - mermaid.y,
            );
            if (mermaidDistance < radius) {
              group.state = "flee";
              group.heading = fleeHeading(group, mermaid);
              group.fleeTopSpeed = FLEE_SPEED * fleeSpeedBoost(mermaidDistance, radius);
              applyFlip(group, Math.cos(group.heading) >= 0 ? 1 : -1, now);
            } else {
              if (group.state === "regroup") {
                const leader = groups[leaderIndexOf(index)];
                group.waypoint = { x: leader.x, y: leader.y };
              } else if (!group.waypoint) {
                pickWaypoint(group, index, groups);
              }
              const desired = Math.atan2(
                group.waypoint!.y - group.y,
                group.waypoint!.x - group.x,
              );
              const turnRate =
                group.state === "regroup" ? TURN_RATE * 1.5 : TURN_RATE;
              let targetSpeed =
                group.state === "regroup" ? REGROUP_SPEED : CRUISE_SPEED;
              if (group.state === "cruise" && index !== leaderIndexOf(index)) {
                const leader = groups[leaderIndexOf(index)];
                const leaderDistance = Math.hypot(
                  group.x - leader.x,
                  group.y - leader.y,
                );
                if (leaderDistance > 160) targetSpeed = CRUISE_SPEED * 1.7;
              }
              group.heading = turnToward(
                group.heading,
                desired,
                turnRate * deltaSeconds,
              );
              group.speed +=
                (targetSpeed - group.speed) *
                (1 - Math.exp(-2.2 * deltaSeconds));
              group.x += Math.cos(group.heading) * group.speed * deltaSeconds;
              group.y += Math.sin(group.heading) * group.speed * deltaSeconds;
              applyFlip(group, Math.cos(group.heading) >= 0 ? 1 : -1, now);
              if (
                Math.hypot(group.waypoint!.x - group.x, group.waypoint!.y - group.y) <
                WAYPOINT_ARRIVAL
              ) {
                if (group.state === "regroup") group.state = "cruise";
                pickWaypoint(group, index, groups);
              }
            }
          }

          renderGroup(group, index, now);
        }
      }

      rafId = isMobile
        ? window.setTimeout(() => { rafId = requestAnimationFrame(frame); }, 33) as unknown as number
        : requestAnimationFrame(frame);
    };

    const start = () => {
      if (rafId) return;
      running = true;
      lastFrameAt = 0;
      rafId = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (rafId) {
        if (isMobile) window.clearTimeout(rafId);
        else cancelAnimationFrame(rafId);
      }
      rafId = 0;
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
        for (const video of layer.querySelectorAll("video")) video.pause();
      } else if (!reducedMotionRef.current) {
        for (const video of layer.querySelectorAll("video")) {
          void video.play().catch(() => undefined);
        }
        start();
      }
    };

    motionQuery.addEventListener("change", syncReducedMotion);
    document.addEventListener("visibilitychange", handleVisibility);
    syncReducedMotion();
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      motionQuery.removeEventListener("change", syncReducedMotion);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [mermaidRef]);

  return (
    <div ref={layerRef} className="background-fish-layer" aria-hidden="true">
      {Array.from({ length: SCHOOL_COUNT * SCHOOL_SIZE }, (_, index) => (
        <div
          key={`${index}-${FISH_VIDEOS[index % SCHOOL_SIZE]}`}
          ref={(element) => {
            groupRefs.current[index] = element;
          }}
          className={"background-fish-group" + (index >= SCHOOL_SIZE ? " background-fish-group--desktop-only" : "")}
        >
          {useIosPoster && index < SCHOOL_SIZE ? (
            <img
              className="background-fish-video background-fish-ios-poster"
              src={FISH_IOS_POSTERS[index]}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          ) : (
            <video
              ref={(element) => {
                videoRefs.current[index] = element;
              }}
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              tabIndex={-1}
            >
              {index < SCHOOL_SIZE ? (
                <source
                  media="(max-width: 1200px)"
                  src={MOBILE_FISH_VIDEOS[index]}
                  type="video/webm"
                />
              ) : null}
              <source
                src={FISH_VIDEOS[index % SCHOOL_SIZE]}
                type="video/webm"
              />
            </video>
          )}
        </div>
      ))}
    </div>
  );
}
