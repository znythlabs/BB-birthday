"use client";

/* eslint-disable @next/next/no-img-element -- immutable full-bleed scene art is sized by the viewport */

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { eventDetails } from "@/data/eventDetails";
import {
  interactiveObjects,
  type InteractiveSeaObjectData,
  type SeaObjectKind,
} from "@/data/seaObjects";
import { spriteCatalog } from "@/data/spriteCatalog";
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
import { mermaidAltitude, projectShadow } from "@/lib/underwaterProjection.mjs";
import { AmbientLayers } from "./AmbientLayers";
import { BackgroundFishSchools } from "./BackgroundFishSchools";
import { BubbleMessage } from "./BubbleMessage";
import { InteractiveSeaObject } from "./InteractiveSeaObject";
import {
  MermaidCharacter,
  type MermaidAction,
} from "./MermaidCharacter";
import { PartyDetailsDialog } from "./PartyDetailsDialog";
import type { SpriteProjection } from "./SpriteActor";

type Point = { x: number; y: number };
type ObjectPositions = Partial<Record<SeaObjectKind, Point>>;
type ObjectFacings = Partial<Record<SeaObjectKind, 1 | -1>>;
type MermaidVisual = Point & {
  width: number;
  facing: 1 | -1;
  travelSpeed: number;
  shadow: SpriteProjection;
};

const START_POSITION = { x: 50, y: 49 } as const;
const MERMAID_EDGE_PADDING = 76;
const createInitialObjectPositions = (width: number, height: number): ObjectPositions =>
  Object.fromEntries(
    interactiveObjects.map((object) => [
      object.kind,
      { x: (object.x / 100) * width, y: (object.y / 100) * height },
    ]),
  );

const EMPTY_SHADOW: SpriteProjection = {
  groundX: 0,
  groundY: 0,
  opacity: 0,
  blurPx: 3,
  scaleX: 1,
  scaleY: 0.2,
  skewXDeg: -5,
};

export function UnderwaterScene() {
  const sceneRef = useRef<HTMLElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const draggingPointerRef = useRef<number | null>(null);
  const discoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const currentRef = useRef<Point>({ x: 0, y: 0 });
  const targetRef = useRef<Point>({ x: 0, y: 0 });
  const activeIdRef = useRef<string | null>(null);
  const pinnedIdRef = useRef<string | null>(null);
  const dismissedIdRef = useRef<string | null>(null);
  const reducedMotionRef = useRef(false);
  const pointerMotionRef = useRef({ x: 0, y: 0, time: 0, speed: 0 });
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const jellyfishTargetRef = useRef<Point | null>(null);
  const objectPositionsRef = useRef<ObjectPositions>({});
  const objectFacingsRef = useRef<ObjectFacings>({});
  const turtleTargetRef = useRef<Point | null>(null);
  const crabTargetRef = useRef<Point | null>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);
  const backgroundRef = useRef<HTMLVideoElement>(null);
  const bgmStartedRef = useRef(false);
  const [bgmMuted, setBgmMuted] = useState(true);
  const [sceneEntered, setSceneEntered] = useState(false);
  const startBgm = useCallback(() => {
    const audio = bgmRef.current;
    if (!audio || bgmStartedRef.current) return;
    bgmStartedRef.current = true;
    audio.muted = false;
    setBgmMuted(false);
    void audio.play().catch(() => {
      bgmStartedRef.current = false;
      audio.muted = true;
      setBgmMuted(true);
    });
  }, []);
  const toggleBgm = useCallback(() => {
    const audio = bgmRef.current;
    if (!audio) return;
    if (bgmMuted) {
      bgmStartedRef.current = false;
      startBgm();
      return;
    }
    audio.muted = true;
    setBgmMuted(true);
  }, [bgmMuted, startBgm]);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const observer = new IntersectionObserver(
      ([entry]) => setSceneEntered(entry.intersectionRatio >= 0.9),
      { threshold: [0, 0.9, 1] },
    );

    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const background = backgroundRef.current;
    if (!scene || !background) return;

    const videos = Array.from(
      scene.querySelectorAll<HTMLVideoElement>("video"),
    );
    const pauseVideos = () => videos.forEach((video) => video.pause());

    if (!sceneEntered) {
      pauseVideos();
      if (background.readyState >= 1) background.currentTime = 0;
      scene.addEventListener("play", pauseVideos, true);
      return () => scene.removeEventListener("play", pauseVideos, true);
    }

    videos.forEach((video) => {
      void video.play().catch(() => {});
    });
    startBgm();
  }, [sceneEntered, startBgm]);
  const [objectFacings, setObjectFacings] = useState<ObjectFacings>({});
  const [objectPositions, setObjectPositions] = useState<ObjectPositions>({});
  const [discovering, setDiscovering] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });
  const [mermaidVisual, setMermaidVisual] = useState<MermaidVisual>({
    x: 0,
    y: 0,
    width: 300,
    facing: 1,
    travelSpeed: 0,
    shadow: EMPTY_SHADOW,
  });

  const updateActiveId = useCallback((nextId: string | null) => {
    if (activeIdRef.current === nextId) return;
    activeIdRef.current = nextId;
    setActiveId(nextId);
    if (discoveryTimerRef.current) clearTimeout(discoveryTimerRef.current);
    if (nextId) {
      setDiscovering(true);
      const discoverClip = spriteCatalog.mermaid.discover;
      discoveryTimerRef.current = setTimeout(
        () => setDiscovering(false),
        (discoverClip.frames / discoverClip.fps) * 1000,
      );
    } else {
      setDiscovering(false);
    }
  }, []);

  const setTargetPoint = useCallback((x: number, y: number) => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return;
    const topPadding = Math.min(172, Math.max(118, height * 0.2));
    targetRef.current = {
      x: clamp(x, MERMAID_EDGE_PADDING, width - MERMAID_EDGE_PADDING),
      y: clamp(y, topPadding, height - MERMAID_EDGE_PADDING),
    };
    setHasMoved(true);
  }, []);

  const moveTargetFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const now = performance.now();
      const previous = pointerMotionRef.current;
      if (previous.time > 0) {
        const elapsed = Math.max(8, now - previous.time);
        const sampledSpeed = Math.hypot(x - previous.x, y - previous.y) / elapsed;
        previous.speed = previous.speed * 0.58 + sampledSpeed * 0.42;
      }
      previous.x = x;
      previous.y = y;
      previous.time = now;
      pinnedIdRef.current = null;
      setTargetPoint(x, y);
    },
    [setTargetPoint],
  );

  const activateObject = useCallback(
    (object: InteractiveSeaObjectData) => {
      const { width, height } = sizeRef.current;
      pinnedIdRef.current = object.id;
      dismissedIdRef.current = null;
      updateActiveId(object.id);
      const point = objectPositionsRef.current[object.kind] ?? {
        x: (object.x / 100) * width,
        y: (object.y / 100) * height,
      };
      setTargetPoint(point.x, point.y);
    },
    [setTargetPoint, updateActiveId],
  );

  const closeActiveDetail = useCallback(() => {
    dismissedIdRef.current = activeIdRef.current;
    pinnedIdRef.current = null;
    updateActiveId(null);
  }, [updateActiveId]);

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
    setShowAllDetails(true);
  }, [closeActiveDetail]);

  const closeAllDetails = useCallback(() => {
    setShowAllDetails(false);
    requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches;
    };
    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);

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
      facing = faceTowardTarget(current, target, facing);
      const movementAmount = reducedMotionRef.current ? 1 : deltaSeconds;
      const next = reducedMotionRef.current
        ? target
        : smoothToward(current, target, movementAmount, 4.6);
      const travelSpeed = deltaSeconds > 0
        ? Math.hypot(next.x - current.x, next.y - current.y) / deltaSeconds
        : 0;
      current.x = next.x;
      current.y = next.y;
      pointerMotionRef.current.speed *= Math.exp(-5 * deltaSeconds);

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
              x: clamp(current.x - 120, 110, width - 110),
              y: clamp(current.y - 36, height * 0.2, height * 0.92),
            }
          : null;
        const nextFish = fish && fishTarget
          ? followTarget(fish, fishTarget, 1 - Math.exp(-0.35 * deltaSeconds))
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
        if (now - lastVisualUpdate >= 16) {
          setObjectPositions(nextObjects);
          setObjectFacings(nextFacings);
        }
      }

      if (width && height && now - lastVisualUpdate >= 16) {
        const altitude = mermaidAltitude(current.y, height);
        const projected = projectShadow({
          x: current.x,
          y: current.y,
          sceneWidth: width,
          sceneHeight: height,
          altitude,
          speed: Math.max(pointerMotionRef.current.speed * 1000, travelSpeed * 60),
          facing,
        });
        const groundedProjection = {
          ...projected,
          groundY: Math.max(projected.groundY, height * 0.82),
        };
        setMermaidVisual({
          x: current.x,
          y: current.y,
          width: clamp(width * 0.3, 240, 380),
          facing,
          travelSpeed,
          shadow: groundedProjection,
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
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updateActiveId]);

  useEffect(
    () => () => {
      if (discoveryTimerRef.current) clearTimeout(discoveryTimerRef.current);
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
  const mermaidAction: MermaidAction = discovering
    ? "discover"
    : mermaidVisual.travelSpeed > 1.4
      ? "swim"
      : "idle";

  return (
    <section
      ref={sceneRef}
      className="underwater-scene"
      data-transitioning={!sceneEntered || undefined}
      data-dialog-open={showAllDetails || undefined}
      onPointerDown={(event) => {
        if (showAllDetails) return;
        startBgm();
        if ((event.target as Element).closest("button")) return;
        draggingPointerRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTargetFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (showAllDetails) return;
        if (
          event.pointerType === "mouse" ||
          draggingPointerRef.current === event.pointerId
        ) {
          moveTargetFromPointer(event);
        }
      }}
      onPointerUp={(event) => {
        if (draggingPointerRef.current === event.pointerId) {
          draggingPointerRef.current = null;
        }
      }}
      onPointerCancel={() => {
        draggingPointerRef.current = null;
      }}
    >
      <audio
        ref={bgmRef}
        className="scene-bgm"
        src="/bgm/underwater%20bgm.MP3"
        autoPlay
        loop
        muted={bgmMuted}
        preload="auto"
        aria-hidden="true"
      />
      <button
        type="button"
        className="scene-bgm-toggle"
        aria-label={`${bgmMuted ? "Unmute" : "Mute"} background music`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={toggleBgm}
      >
        {bgmMuted ? "Unmute music" : "Mute music"}
      </button>
      <video
        ref={backgroundRef}
        className="underwater-background"
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/images/underwater/background-main.mp4" type="video/mp4" />
      </video>
      <BackgroundFishSchools mermaidRef={currentRef} />
      <AmbientLayers />

      <header className="underwater-title-lockup">
        <img
          className="underwater-title-art"
          src="/images/ui/liliana-underwater-title.png"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <h2 className="sr-only">Liliana’s First Birthday</h2>
      </header>

      <div className="interaction-hint" data-hidden={hasMoved || undefined}>
        <span className="hint-shimmer" aria-hidden="true" />
        <span>Move, tap, or drag to guide Liliana</span>
      </div>

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
        action={mermaidAction}
        facing={mermaidVisual.facing}
        shadow={mermaidVisual.shadow}
        width={mermaidVisual.width}
        audioMuted={bgmMuted}
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
        Open all party details
      </button>
      {showAllDetails ? <PartyDetailsDialog onClose={closeAllDetails} /> : null}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {activeObject ? `${activeObject.label}: ${activeObject.value}` : ""}
      </p>
    </section>
  );
}
