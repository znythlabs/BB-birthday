"use client";

/* eslint-disable @next/next/no-img-element -- immutable full-bleed scene art is sized by the viewport */

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  interactiveObjects,
  type InteractiveSeaObjectData,
  type SeaObjectKind,
} from "@/data/seaObjects";
import { clamp, distanceBetween } from "@/lib/distance";
import {
  CRAB_PATROL_SPEED,
  JELLYFISH_FLOAT_SPEED,
  TURTLE_PATROL_SPEED,
  smoothToward,
  advancePatrol,
  faceTowardTarget,
  crabGroundBounds,
  followTarget,
  isNear,
  jellyfishFloatBounds,
  randomCrabWaypoint,
  randomJellyfishWaypoint,
  randomTurtleWaypoint,
  turtleSurfaceBounds,
} from "@/lib/objectMotion.mjs";
import { AmbientLayers } from "./AmbientLayers";
import { BackgroundFishSchools } from "./BackgroundFishSchools";
import {
  isBgmMuted as isWebBgmMuted,
  resumeBgmIfNeeded as resumeWebBgmIfNeeded,
  setBgmMuted as setWebBgmMuted,
  startBgm as startWebBgm,
} from "@/lib/bgmManager";
import {
  resumeMermaidAudioIfNeeded as resumeWebMermaidIfNeeded,
  setMermaidMuted as setWebMermaidMuted,
  startMermaidAudio as startWebMermaidAudio,
  syncMermaidToVideo as syncWebMermaidToVideo,
} from "@/lib/mermaidAudioManager";
import { BubbleMessage } from "./BubbleMessage";
import { InteractiveSeaObject } from "./InteractiveSeaObject";
import { MermaidCharacter } from "./MermaidCharacter";
import { PartyDetailsDialog } from "./PartyDetailsDialog";
import {
  enterMobileFullscreen as requestMobileFullscreen,
  isIos,
  isMobileFullscreen,
  toggleMobileFullscreen,
} from "@/lib/mobileFullscreen";

type Point = { x: number; y: number };
type ObjectPositions = Partial<Record<SeaObjectKind, Point>>;
type ObjectFacings = Partial<Record<SeaObjectKind, 1 | -1>>;
type MermaidVisual = Point & {
  width: number;
  facing: 1 | -1;
};

const START_POSITION = { x: 50, y: 49 } as const;
const MERMAID_EDGE_PADDING = 76;
const MOBILE_MEDIA_QUERY = "(max-width: 1200px)";
const createInitialObjectPositions = (width: number, height: number): ObjectPositions =>
  Object.fromEntries(
    interactiveObjects.map((object) => [
      object.kind,
      { x: (object.x / 100) * width, y: (object.y / 100) * height },
    ]),
  );

export function UnderwaterScene({ active, adventureStarted }: { active?: boolean; adventureStarted?: boolean } = {}) {
  const sceneRef = useRef<HTMLElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const cursorTrailRef = useRef<HTMLSpanElement>(null);
  const cursorIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const draggingPointerRef = useRef<number | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const currentRef = useRef<Point>({ x: 0, y: 0 });
  const targetRef = useRef<Point>({ x: 0, y: 0 });
  const activeIdRef = useRef<string | null>(null);
  const pinnedIdRef = useRef<string | null>(null);
  const dismissedIdRef = useRef<string | null>(null);
  const reducedMotionRef = useRef(false);
  const mobileRef = useRef(false);
  const pointerTargetRef = useRef<Point | null>(null);
  const joystickRef = useRef({
    x: 0,
    y: 0,
    pointerId: null as number | null,
    velocity: { x: 0, y: 0 },
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const jellyfishTargetRef = useRef<Point | null>(null);
  const objectPositionsRef = useRef<ObjectPositions>({});
  const objectFacingsRef = useRef<ObjectFacings>({});
  const turtleTargetRef = useRef<Point | null>(null);
  const crabTargetRef = useRef<Point | null>(null);
  const backgroundRef = useRef<HTMLVideoElement>(null);
  const mermaidVideoRef = useRef<HTMLVideoElement>(null);
  const bgmStartedRef = useRef(false);
  const [bgmMuted, setBgmMuted] = useState(true);
  const [sceneEntered, setSceneEntered] = useState(false);
  const startBgm = useCallback(() => {
    if (bgmStartedRef.current) return;
    bgmStartedRef.current = true;
    setBgmMuted(false);
    void startWebBgm();
    void startWebMermaidAudio();
  }, []);
  const enterMobileFullscreen = useCallback(async () => {
    if (!window.matchMedia(MOBILE_MEDIA_QUERY).matches) return;
    await requestMobileFullscreen();
    setIsFullscreen(isMobileFullscreen());
  }, []);

  const toggleBgm = useCallback(() => {
    if (bgmMuted) {
      setBgmMuted(false);
      bgmStartedRef.current = false;
      startBgm();
      return;
    }
    setBgmMuted(true);
    setWebBgmMuted(true);
    setWebMermaidMuted(true);
  }, [bgmMuted, startBgm]);

  // Website sound is one state: BGM and mermaid laugh must always mute together.
  useEffect(() => {
    setWebBgmMuted(bgmMuted);
    setWebMermaidMuted(bgmMuted);
  }, [bgmMuted]);

  useEffect(() => {
    const moveGlobalCursor = (event: MouseEvent) => {
      const transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      if (cursorRef.current) {
        cursorRef.current.style.transform = transform;
        cursorRef.current.dataset.visible = "true";
      }
      if (cursorTrailRef.current) {
        cursorTrailRef.current.style.transform = transform;
        cursorTrailRef.current.dataset.visible = "true";
      }
      if (cursorIdleTimerRef.current) clearTimeout(cursorIdleTimerRef.current);
      cursorIdleTimerRef.current = setTimeout(() => {
        if (cursorRef.current) delete cursorRef.current.dataset.visible;
        if (cursorTrailRef.current) delete cursorTrailRef.current.dataset.visible;
      }, 2000);
    };
    const hideGlobalCursor = () => {
      if (cursorRef.current) delete cursorRef.current.dataset.visible;
      if (cursorTrailRef.current) delete cursorTrailRef.current.dataset.visible;
    };
    window.addEventListener("mousemove", moveGlobalCursor);
    document.documentElement.addEventListener("mouseleave", hideGlobalCursor);
    return () => {
      window.removeEventListener("mousemove", moveGlobalCursor);
      document.documentElement.removeEventListener("mouseleave", hideGlobalCursor);
    };
  }, []);

  useEffect(() => {
    setIsIosDevice(isIos());
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(isMobileFullscreen());
    document.addEventListener("fullscreenchange", syncFullscreenState);
    // iOS Safari fires webkitfullscreenchange (video fullscreen) instead.
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    const handleGlobalToggle = () => toggleBgm();
    const handleGlobalEnable = () => {
      if (!bgmMuted) return;
      bgmStartedRef.current = false;
      startBgm();
    };
    window.addEventListener("invitation-audio-toggle", handleGlobalToggle);
    window.addEventListener("invitation-audio-enable", handleGlobalEnable);
    window.dispatchEvent(new CustomEvent("invitation-audio-state", { detail: { muted: bgmMuted } }));
    return () => {
      window.removeEventListener("invitation-audio-toggle", handleGlobalToggle);
      window.removeEventListener("invitation-audio-enable", handleGlobalEnable);
    };
  }, [bgmMuted, startBgm, toggleBgm]);

  useEffect(() => {
    const unlockAudio = () => {
      startBgm();
      window.removeEventListener("pointerdown", unlockAudio, true);
      window.removeEventListener("keydown", unlockAudio, true);
    };

    window.addEventListener("pointerdown", unlockAudio, true);
    window.addEventListener("keydown", unlockAudio, true);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio, true);
      window.removeEventListener("keydown", unlockAudio, true);
    };
  }, [startBgm]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasDiscovered, setHasDiscovered] = useState(false);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const observer = new IntersectionObserver(
      ([entry]) => setSceneEntered(active ?? entry.intersectionRatio >= 0.9),
      { threshold: [0, 0.9, 1] },
    );

    observer.observe(scene);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (!adventureStarted || !window.matchMedia(MOBILE_MEDIA_QUERY).matches) return;
    void requestMobileFullscreen();
  }, [adventureStarted]);

  // The desktop underwater background has preload="none", so on a cold cache
  // it has no decoded frame when the transition hands off — the scene would
  // flash the plain blue page background until its first frame decodes.
  // The transition's final frame matches this video's first frame, so once
  // the handoff begins we kick off the background download and start playback;
  // by deferring it until the scrub finishes, the 28 MB background never
  // competes with the 48 MB transition video for bandwidth.
  useEffect(() => {
    if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) return;
    if (!active) return;
    const background = backgroundRef.current;
    if (!background) return;
    if (background.readyState >= 2 && !background.paused) return;
    void background.play().catch(() => undefined);
  }, [active]);

  useEffect(() => {
    const scene = sceneRef.current;
    const background = backgroundRef.current;
    if (!scene || !background) return;

    const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;
    const videos = Array.from(
      scene.querySelectorAll<HTMLVideoElement>("video"),
    ).filter((video) => !isMobile || !video.classList.contains("desktop-underwater-background"));
    const pauseVideos = () => videos.forEach((video) => video.pause());

    if (!sceneEntered) {
      pauseVideos();
      if (background.readyState >= 1) background.currentTime = 0;
      scene.addEventListener("play", pauseVideos, true);
      return () => scene.removeEventListener("play", pauseVideos, true);
    }

    videos.forEach((video, index) => {
      const delay = isMobile ? index * 90 : 0;
      window.setTimeout(() => {
        void video.play().catch(() => {});
      }, delay);
    });
    startBgm();
  }, [sceneEntered, startBgm]);

  // Keep the mermaid laugh synced to the mermaid animation. The audio is
  // driven by the video's currentTime, so on mobile (where the video can
  // stutter under decode load while Web Audio keeps perfect real-time) we
  // re-sync on every video timeupdate/seeked/play event plus a slow backup
  // interval. This keeps the laugh frame-aligned on low-end phones.
  useEffect(() => {
    if (!sceneEntered) return;
    const video = mermaidVideoRef.current;
    const sync = () => syncWebMermaidToVideo(video);
    if (video) {
      video.addEventListener("timeupdate", sync);
      video.addEventListener("seeked", sync);
      video.addEventListener("play", sync);
      video.addEventListener("waiting", sync);
    }
    const timer = window.setInterval(sync, 500);
    return () => {
      if (video) {
        video.removeEventListener("timeupdate", sync);
        video.removeEventListener("seeked", sync);
        video.removeEventListener("play", sync);
        video.removeEventListener("waiting", sync);
      }
      window.clearInterval(timer);
    };
  }, [sceneEntered]);

  useEffect(() => {
    if (!window.matchMedia(MOBILE_MEDIA_QUERY).matches) return;
    const resume = () => {
      if (document.hidden) return;
      resumeWebBgmIfNeeded();
      resumeWebMermaidIfNeeded();
    };
    document.addEventListener("visibilitychange", resume);
    document.addEventListener("fullscreenchange", resume);
    window.addEventListener("orientationchange", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      document.removeEventListener("fullscreenchange", resume);
      window.removeEventListener("orientationchange", resume);
    };
  }, []);
  const [objectFacings, setObjectFacings] = useState<ObjectFacings>({});
  const [objectPositions, setObjectPositions] = useState<ObjectPositions>({});
  const objectRenderRef = useRef({ positions: {} as ObjectPositions, facings: {} as ObjectFacings });
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });
  const [mermaidVisual, setMermaidVisual] = useState<MermaidVisual>({
    x: 0,
    y: 0,
    width: 300,
    facing: 1,
  });

  const updateActiveId = useCallback((nextId: string | null) => {
    if (activeIdRef.current === nextId) return;
    activeIdRef.current = nextId;
    setActiveId(nextId);
  }, []);

  const setTargetPoint = useCallback((x: number, y: number) => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return;
    const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;
    const topPadding = isMobile
      ? Math.min(100, Math.max(36, height * 0.08))
      : Math.min(172, Math.max(118, height * 0.2));
    targetRef.current = {
      x: clamp(x, MERMAID_EDGE_PADDING, width - MERMAID_EDGE_PADDING),
      y: clamp(y, topPadding, height - MERMAID_EDGE_PADDING),
    };
  }, []);

  const moveTargetFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      pinnedIdRef.current = null;
      pointerTargetRef.current = { x, y };
    },
    [],
  );

  const activateObject = useCallback(
    (object: InteractiveSeaObjectData) => {
      const { width, height } = sizeRef.current;
      pinnedIdRef.current = object.id;
      dismissedIdRef.current = null;
      updateActiveId(object.id);
      setHasDiscovered(true);
      pointerTargetRef.current = null;
      const point = objectPositionsRef.current[object.kind] ?? {
        x: (object.x / 100) * width,
        y: (object.y / 100) * height,
      };
      setTargetPoint(point.x, point.y);
    },
    [setTargetPoint, updateActiveId],
  );

  const closeActiveDetail = useCallback(() => {
    if (detailCloseTimerRef.current) clearTimeout(detailCloseTimerRef.current);
    detailCloseTimerRef.current = null;
    dismissedIdRef.current = activeIdRef.current;
    pinnedIdRef.current = null;
    updateActiveId(null);
  }, [updateActiveId]);

  useEffect(() => {
    if (
      activeId !== "fish-courier" ||
      !window.matchMedia(MOBILE_MEDIA_QUERY).matches
    ) return;
    if (detailCloseTimerRef.current) clearTimeout(detailCloseTimerRef.current);
    detailCloseTimerRef.current = setTimeout(closeActiveDetail, 3000);
    return () => {
      if (detailCloseTimerRef.current) clearTimeout(detailCloseTimerRef.current);
      detailCloseTimerRef.current = null;
    };
  }, [activeId, closeActiveDetail]);

  const openAllDetails = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const activePointerId = draggingPointerRef.current;
    const scene = sceneRef.current;
    if (
      activePointerId !== null &&
      scene?.hasPointerCapture(activePointerId)
    ) {
      scene.releasePointerCapture(activePointerId);
    }
    draggingPointerRef.current = null;
    closeActiveDetail();
    document.body.classList.add("underwater-dialog-open");
    setShowAllDetails(true);
  }, [closeActiveDetail]);

  const closeAllDetails = useCallback(() => {
    document.body.classList.remove("underwater-dialog-open");
    setShowAllDetails(false);
    requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const syncMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches;
      mobileRef.current = mobileQuery.matches;
    };
    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);
    mobileQuery.addEventListener("change", syncMotionPreference);

    const resizeObserver = new ResizeObserver(([entry]) => {
      const previousSize = sizeRef.current;
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      sizeRef.current = { width, height };
      setSceneSize({ width, height });

      if (!previousSize.width || !previousSize.height) {
        const initialPositions = createInitialObjectPositions(width, height);
        const initialFacings = Object.fromEntries(
          interactiveObjects.map((object) => [object.kind, 1]),
        ) as ObjectFacings;
        objectPositionsRef.current = initialPositions;
        objectFacingsRef.current = initialFacings;
        objectRenderRef.current = { positions: initialPositions, facings: initialFacings };
        setObjectPositions(initialPositions);
        setObjectFacings(initialFacings);
        currentRef.current = {
          x: (START_POSITION.x / 100) * width,
          y: (START_POSITION.y / 100) * height,
        };
        targetRef.current = { ...currentRef.current };
      } else {
        const scaleX = width / previousSize.width;
        const scaleY = height / previousSize.height;
        const resizedPositions = Object.fromEntries(
          Object.entries(objectPositionsRef.current).map(([kind, position]) => [
            kind,
            position ? { x: position.x * scaleX, y: position.y * scaleY } : position,
          ]),
        ) as ObjectPositions;
        objectPositionsRef.current = resizedPositions;
        objectRenderRef.current.positions = resizedPositions;
        setObjectPositions(resizedPositions);
        currentRef.current = {
          x: currentRef.current.x * scaleX,
          y: currentRef.current.y * scaleY,
        };
        targetRef.current = {
          x: targetRef.current.x * scaleX,
          y: targetRef.current.y * scaleY,
        };
        if (turtleTargetRef.current) {
          turtleTargetRef.current = {
            x: turtleTargetRef.current.x * scaleX,
            y: turtleTargetRef.current.y * scaleY,
          };
        }
        if (crabTargetRef.current) {
          crabTargetRef.current = {
            x: crabTargetRef.current.x * scaleX,
            y: crabTargetRef.current.y * scaleY,
          };
        }
        if (jellyfishTargetRef.current) {
          jellyfishTargetRef.current = {
            x: jellyfishTargetRef.current.x * scaleX,
            y: jellyfishTargetRef.current.y * scaleY,
          };
        }
      }
    });
    resizeObserver.observe(scene);

    let running = true;
    let lastVisualUpdate = 0;
    let lastObjectVisualUpdate = 0;
    let lastFrameAt = 0;
    let facing: 1 | -1 = 1;
    const renderFrame = (now: number) => {
      const current = currentRef.current;
      const target = targetRef.current;
      if (!running) return;
      const deltaSeconds = lastFrameAt
        ? Math.min((now - lastFrameAt) / 1000, 0.05)
        : 1 / 60;
      lastFrameAt = now;
      const joystick = joystickRef.current;
      if (joystick.pointerId !== null) {
        // Joystick: eased analog velocity control. The velocity eases toward the
        // joystick target (exponential smoothing, same style as desktop's
        // smoothToward), then eases to rest on release — no instant teleporting.
        const { width, height } = sizeRef.current;
        const maxSpeed = 480;
        const easeRate = 5.5;
        const targetVelocity = { x: joystick.x * maxSpeed, y: joystick.y * maxSpeed };
        const vel = joystick.velocity;
        vel.x += (targetVelocity.x - vel.x) * (1 - Math.exp(-easeRate * deltaSeconds));
        vel.y += (targetVelocity.y - vel.y) * (1 - Math.exp(-easeRate * deltaSeconds));
        const nextX = clamp(
          current.x + vel.x * deltaSeconds,
          MERMAID_EDGE_PADDING,
          width - MERMAID_EDGE_PADDING,
        );
        const nextY = clamp(
          current.y + vel.y * deltaSeconds,
          mobileRef.current
            ? Math.min(100, Math.max(36, height * 0.08))
            : Math.min(172, Math.max(118, height * 0.2)),
          height - MERMAID_EDGE_PADDING,
        );
        // Flip the mermaid based on the joystick's horizontal input directly,
        // since the follow target is synced to current and would never trigger a flip.
        if (Math.abs(joystick.x) > 0.08) facing = joystick.x > 0 ? 1 : -1;
        current.x = nextX;
        current.y = nextY;
        targetRef.current = { ...current };
      } else if (Math.abs(joystick.velocity.x) > 1 || Math.abs(joystick.velocity.y) > 1) {
        // Joystick released: ease the remaining velocity to rest (coast to a stop).
        const { width, height } = sizeRef.current;
        const vel = joystick.velocity;
        const decayRate = 4;
        const decay = 1 - Math.exp(-decayRate * deltaSeconds);
        vel.x -= vel.x * decay;
        vel.y -= vel.y * decay;
        const nextX = clamp(
          current.x + vel.x * deltaSeconds,
          MERMAID_EDGE_PADDING,
          width - MERMAID_EDGE_PADDING,
        );
        const nextY = clamp(
          current.y + vel.y * deltaSeconds,
          mobileRef.current
            ? Math.min(100, Math.max(36, height * 0.08))
            : Math.min(172, Math.max(118, height * 0.2)),
          height - MERMAID_EDGE_PADDING,
        );
        current.x = nextX;
        current.y = nextY;
        targetRef.current = { ...current };
        if (Math.abs(vel.x) <= 1 && Math.abs(vel.y) <= 1) {
          vel.x = 0;
          vel.y = 0;
        }
      } else {
        const pointerTarget = pointerTargetRef.current;
        if (pointerTarget) targetRef.current = smoothToward(target, pointerTarget, deltaSeconds, 7);
      }
      facing = faceTowardTarget(current, targetRef.current, facing);
      if (joystick.pointerId === null) {
        const movementAmount = reducedMotionRef.current ? 1 : deltaSeconds;
        const next = reducedMotionRef.current
          ? target
          : smoothToward(current, targetRef.current, movementAmount, 3.2);
        current.x = next.x;
        current.y = next.y;
      }

      const { width, height } = sizeRef.current;
      if (width && height && deltaSeconds > 0 && !reducedMotionRef.current) {
        const objects = objectPositionsRef.current;
        const fish = objects["fish-courier"];
        const turtle = objects["sea-turtle"];
        const crab = objects.crab;
        const jellyfish = objects.jellyfish;
        const jellyfishBounds = jellyfishFloatBounds(width, height);
        if (jellyfish && !jellyfishTargetRef.current) {
          jellyfishTargetRef.current = randomJellyfishWaypoint(jellyfishBounds);
        }
        if (jellyfish && jellyfishTargetRef.current && isNear(jellyfish, jellyfishTargetRef.current, 10)) {
          jellyfishTargetRef.current = randomJellyfishWaypoint(jellyfishBounds);
        }
        const nextJellyfish = jellyfish && jellyfishTargetRef.current
          ? advancePatrol(
              jellyfish,
              jellyfishTargetRef.current,
              JELLYFISH_FLOAT_SPEED,
              deltaSeconds,
              false,
            )
          : jellyfish;
        const fishTarget = fish
          ? {
              x: clamp(current.x - (mobileRef.current ? 8 : 30), 110, width - 110),
              y: clamp(current.y - (mobileRef.current ? 12 : 20), height * 0.2, height * 0.92),
            }
          : null;
        const nextFish = fish && fishTarget
          ? followTarget(fish, fishTarget, 1 - Math.exp(-1.2 * deltaSeconds))
          : fish;
        const turtleBounds = turtleSurfaceBounds(width, height);
        if (turtle && !turtleTargetRef.current) {
          turtleTargetRef.current = randomTurtleWaypoint(turtleBounds);
        }
        const turtleStopped = turtle
          ? isNear(turtle, current, Math.max(140, Math.min(190, Math.min(width, height) * 0.24)))
          : true;
        if (turtle && turtleTargetRef.current && !turtleStopped && isNear(turtle, turtleTargetRef.current, 12)) {
          turtleTargetRef.current = randomTurtleWaypoint(turtleBounds);
        }
        const nextTurtle = turtle && turtleTargetRef.current
          ? advancePatrol(
              turtle,
              turtleTargetRef.current,
              TURTLE_PATROL_SPEED,
              deltaSeconds,
              turtleStopped,
            )
          : turtle;
        const crabBounds = crabGroundBounds(width, height);
        if (crab && !crabTargetRef.current) {
          crabTargetRef.current = randomCrabWaypoint(crabBounds);
        }
        if (crab && crabTargetRef.current && isNear(crab, crabTargetRef.current, 10)) {
          crabTargetRef.current = randomCrabWaypoint(crabBounds);
        }
        const nextCrab = crab && crabTargetRef.current
          ? advancePatrol(
              crab,
              crabTargetRef.current,
              CRAB_PATROL_SPEED,
              deltaSeconds,
              false,
            )
          : crab;
        const nextObjects = {
          ...objects,
          ...(nextFish ? { "fish-courier": nextFish } : {}),
          ...(nextTurtle ? { "sea-turtle": nextTurtle } : {}),
          ...(nextCrab ? { crab: nextCrab } : {}),
          ...(nextJellyfish ? { jellyfish: nextJellyfish } : {}),
        };
        const nextFacings = { ...objectFacingsRef.current };
        if (fish && nextFish && Math.abs(nextFish.x - fish.x) > 0.01) {
          nextFacings["fish-courier"] = nextFish.x >= fish.x ? 1 : -1;
        }
        if (turtle && nextTurtle && Math.abs(nextTurtle.x - turtle.x) > 0.01) {
          nextFacings["sea-turtle"] = nextTurtle.x >= turtle.x ? 1 : -1;
        }
        if (crab && nextCrab && Math.abs(nextCrab.x - crab.x) > 0.01) {
          nextFacings.crab = nextCrab.x >= crab.x ? 1 : -1;
        }
        objectPositionsRef.current = nextObjects;
        objectFacingsRef.current = nextFacings;
        if (now - lastObjectVisualUpdate >= (mobileRef.current ? 40 : 0)) {
          objectRenderRef.current = { positions: nextObjects, facings: nextFacings };
          setObjectPositions(nextObjects);
          setObjectFacings(nextFacings);
          lastObjectVisualUpdate = now;
        }
      }

      if (width && height && now - lastVisualUpdate >= 16) {
        setMermaidVisual({
          x: current.x,
          y: current.y,
          width: clamp(width * 0.3, 240, 380),
          facing,
        });
        lastVisualUpdate = now;
      }

      if (width && height && !pinnedIdRef.current) {
        let nearest: InteractiveSeaObjectData | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const object of interactiveObjects) {
          const objectPoint = objectPositionsRef.current[object.kind] ?? {
            x: (object.x / 100) * width,
            y: (object.y / 100) * height,
          };
          const distance = distanceBetween(current, objectPoint);
          const radius = Math.min(
            object.radius,
            Math.max(76, Math.min(width, height) * 0.15),
          );
          if (
            dismissedIdRef.current === object.id &&
            distance > radius * 1.18
          ) {
            dismissedIdRef.current = null;
          }
          if (
            distance < radius &&
            object.id !== dismissedIdRef.current &&
            distance < nearestDistance
          ) {
            nearest = object;
            nearestDistance = distance;
          }
        }
        updateActiveId(nearest?.id ?? null);
      }

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    const startAnimation = () => {
      if (animationFrameRef.current !== null) return;
      running = true;
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };
    const stopAnimation = () => {
      running = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) stopAnimation();
      else startAnimation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startAnimation();
    return () => {
      stopAnimation();
      resizeObserver.disconnect();
      motionQuery.removeEventListener("change", syncMotionPreference);
      mobileQuery.removeEventListener("change", syncMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updateActiveId]);

  useEffect(
    () => () => {
      if (cursorIdleTimerRef.current) clearTimeout(cursorIdleTimerRef.current);
      if (detailCloseTimerRef.current) clearTimeout(detailCloseTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      startBgm();
      if (event.key !== "Escape") return;
      if (showAllDetails) closeAllDetails();
      else if (activeIdRef.current) closeActiveDetail();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeActiveDetail, closeAllDetails, showAllDetails, startBgm]);

  const activeObject = interactiveObjects.find((object) => object.id === activeId);
  const mobileControls = (
    <>
      <div
        className="mobile-joystick"
        aria-label="Mermaid movement joystick"
        role="group"
        onPointerDown={(event) => {
          event.stopPropagation();
          joystickRef.current.pointerId = event.pointerId;
          const el = event.currentTarget;
          const moveHandler = (moveEvent: PointerEvent) => {
            if (joystickRef.current.pointerId !== moveEvent.pointerId) return;
            const box = el.getBoundingClientRect();
            const x = moveEvent.clientX - (box.left + box.width / 2);
            const y = moveEvent.clientY - (box.top + box.height / 2);
            // Extended radius: steering keeps working while the finger stays within 2.5x the knob travel.
            const radius = box.width / 2;
            const extendedRadius = radius * 2.5;
            const distance = Math.hypot(x, y);
            if (distance > extendedRadius) {
              reset();
              return;
            }
            const scale = Math.min(1, 42 / (distance || 1));
            const knob = { x: x * scale, y: y * scale };
            // Deadzone of 6px keeps the mermaid still for accidental micro-movements.
            const deadzone = 6;
            const magnitude = Math.hypot(knob.x, knob.y);
            const response = magnitude > deadzone ? (magnitude - deadzone) / (42 - deadzone) : 0;
            const factor = response / (magnitude || 1);
            joystickRef.current.x = knob.x * factor;
            joystickRef.current.y = knob.y * factor;
            el.style.setProperty("--joystick-x", `${knob.x}px`);
            el.style.setProperty("--joystick-y", `${knob.y}px`);
          };
          const reset = () => {
            joystickRef.current.pointerId = null;
            joystickRef.current.x = 0;
            joystickRef.current.y = 0;
            // Keep velocity: the render loop eases it to rest for a natural coast.
            el.style.setProperty("--joystick-x", "0px");
            el.style.setProperty("--joystick-y", "0px");
            window.removeEventListener("pointermove", moveHandler);
            window.removeEventListener("pointerup", upHandler);
            window.removeEventListener("pointercancel", cancelHandler);
          };
          const upHandler = () => reset();
          const cancelHandler = () => reset();
          window.addEventListener("pointermove", moveHandler);
          window.addEventListener("pointerup", upHandler);
          window.addEventListener("pointercancel", cancelHandler);
        }}
      >
        <span className="mobile-joystick-knob" />
      </div>

      <button
        type="button"
        className="mobile-fullscreen-button"
        onClick={toggleMobileFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen landscape"}
      >
        <span aria-hidden="true">⛶</span>
        <span>{isFullscreen ? "Exit" : "Fullscreen"}</span>
      </button>

      <div className="rotate-device-prompt" role="status">
        <span className="rotate-device-icon" aria-hidden="true">↻</span>
        <strong>Play in landscape</strong>
        <span>Rotate your device for full underwater controls</span>
        <button type="button" className="rotate-device-button" onClick={enterMobileFullscreen}>
          Enter landscape
        </button>
      </div>
    </>
  );

  return (
    <>
    <section
      ref={sceneRef}
      className={isIosDevice ? "underwater-scene ios-device" : "underwater-scene"}
      data-transitioning={!sceneEntered || undefined}
      data-dialog-open={showAllDetails || undefined}
      onPointerDown={(event) => {
        if (showAllDetails) return;
        startBgm();
        if (window.matchMedia(MOBILE_MEDIA_QUERY).matches && !document.fullscreenElement) {
          void enterMobileFullscreen();
        }
        if ((event.target as Element).closest("button")) return;
        if (
          window.matchMedia(MOBILE_MEDIA_QUERY).matches &&
          activeIdRef.current &&
          !(event.target as Element).closest(".bubble-message")
        ) {
          closeActiveDetail();
        }
        draggingPointerRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        // Only desktop pointer drags steer the mermaid; on mobile the joystick is the sole control.
        if (event.pointerType === "mouse") moveTargetFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") {
          const scene = event.currentTarget.getBoundingClientRect();
          const transform = `translate3d(${event.clientX - scene.left}px, ${event.clientY - scene.top}px, 0)`;
          if (cursorRef.current) {
            cursorRef.current.style.transform = transform;
            cursorRef.current.dataset.visible = "true";
          }
          if (cursorTrailRef.current) {
            cursorTrailRef.current.style.transform = transform;
            cursorTrailRef.current.dataset.visible = "true";
          }
          if (cursorIdleTimerRef.current) clearTimeout(cursorIdleTimerRef.current);
          cursorIdleTimerRef.current = setTimeout(() => {
            if (cursorRef.current) delete cursorRef.current.dataset.visible;
            if (cursorTrailRef.current) delete cursorTrailRef.current.dataset.visible;
          }, 2000);
        }
        if (showAllDetails) return;
        if (event.pointerType === "mouse" || draggingPointerRef.current === event.pointerId) moveTargetFromPointer(event);
      }}
      onPointerLeave={() => {
        pointerTargetRef.current = null;
        if (cursorIdleTimerRef.current) clearTimeout(cursorIdleTimerRef.current);
        if (cursorRef.current) delete cursorRef.current.dataset.visible;
        if (cursorTrailRef.current) delete cursorTrailRef.current.dataset.visible;
      }}
      onPointerUp={(event) => {
        if (draggingPointerRef.current === event.pointerId) {
          draggingPointerRef.current = null;
        }
        if (event.pointerType !== "mouse") pointerTargetRef.current = null;
      }}
      onPointerCancel={() => {
        draggingPointerRef.current = null;
        pointerTargetRef.current = null;
      }}
    >
      {mobileControls}
      <span ref={cursorTrailRef} className="game-cursor-trail" aria-hidden="true" />
      <span ref={cursorRef} className="game-cursor-dot" aria-hidden="true" />
      <button
        type="button"
        className="scene-bgm-toggle scene-bgm-toggle-local"
        aria-label={`${bgmMuted ? "Unmute" : "Mute"} background music`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={toggleBgm}
      >
        {bgmMuted ? "Unmute music" : "Mute music"}
      </button>
      <video
        className="underwater-background mobile-underwater-background"
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source media="(max-width: 1200px)" src="/images/underwater/background-mobile.mp4" type="video/mp4" />
      </video>
      <video
        ref={backgroundRef}
        className="underwater-background desktop-underwater-background"
        muted
        loop
        playsInline
        preload="none"
        poster="/images/underwater/underwater-poster.jpg"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source media="(min-width: 1201px)" src="/images/underwater/newunderwater.mp4" type="video/mp4" />
      </video>
      <BackgroundFishSchools mermaidRef={currentRef} />
      <AmbientLayers />

      <header className="underwater-title-lockup">
        <picture>
          <source
            media="(max-width: 1200px)"
            srcSet="/images/mobile/liliana-underwater-title-mobile.webp"
            type="image/webp"
          />
          <img
            className="underwater-title-art"
            src="/images/ui/liliana-underwater-title.png"
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        </picture>
        <h2 className="sr-only">Lilianna’s First Birthday</h2>
      </header>

      <p className="discover-hint" data-hidden={hasDiscovered || undefined}>
        <span className="hint-shimmer" aria-hidden="true" />
        Tap or swim to a sea creature to discover its party detail
        <span className="hint-shimmer" aria-hidden="true" />
      </p>

      <div className="sea-object-layer">
        {interactiveObjects.map((object) => (
          <InteractiveSeaObject
            key={object.id}
            object={object}
            active={activeId === object.id}
            sceneHeight={sceneSize.height}
            sceneWidth={sceneSize.width}
            position={objectPositions[object.kind]}
            facing={objectFacings[object.kind]}
            onActivate={activateObject}
          />
        ))}
      </div>

      <MermaidCharacter
        facing={mermaidVisual.facing}
        videoRef={mermaidVideoRef}
        width={mermaidVisual.width}
        x={mermaidVisual.x}
        y={mermaidVisual.y}
      />
      {activeObject ? (
        <BubbleMessage
          object={activeObject}
          position={objectPositions[activeObject.kind]}
          sceneWidth={sceneSize.width}
          sceneHeight={sceneSize.height}
          mermaidPosition={{ x: mermaidVisual.x, y: mermaidVisual.y }}
          mermaidWidth={mermaidVisual.width}
        />
      ) : null}

      <button
        type="button"
        className="all-details-button"
        onClick={openAllDetails}
      >
        <span className="button-pearl" aria-hidden="true" />
        Party details
      </button>
      {showAllDetails ? <PartyDetailsDialog onClose={closeAllDetails} /> : null}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {activeObject ? `${activeObject.label}: ${activeObject.value}` : ""}
      </p>
    </section>
    </>
  );
}
