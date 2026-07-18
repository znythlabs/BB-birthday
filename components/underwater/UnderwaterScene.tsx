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
} from "@/data/interactiveObjects";
import { spriteCatalog } from "@/data/spriteCatalog";
import { clamp, distanceBetween } from "@/lib/distance";
import { mermaidAltitude, projectShadow } from "@/lib/underwaterProjection.mjs";
import { AmbientLayers } from "./AmbientLayers";
import { BubbleMessage } from "./BubbleMessage";
import { InteractiveSeaObject } from "./InteractiveSeaObject";
import {
  MermaidCharacter,
  type MermaidAction,
} from "./MermaidCharacter";
import { PartyDetailsDialog } from "./PartyDetailsDialog";
import type { SpriteProjection } from "./SpriteActor";

type Point = { x: number; y: number };
type MermaidVisual = Point & {
  width: number;
  facing: 1 | -1;
  travelSpeed: number;
  shadow: SpriteProjection;
};

const START_POSITION = { x: 50, y: 49 } as const;
const MERMAID_EDGE_PADDING = 76;
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
  const [activeId, setActiveId] = useState<string | null>(null);
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
      setTargetPoint((object.x / 100) * width, (object.y / 100) * height);
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
        currentRef.current = {
          x: (START_POSITION.x / 100) * width,
          y: (START_POSITION.y / 100) * height,
        };
        targetRef.current = { ...currentRef.current };
      } else {
        currentRef.current = {
          x: (currentRef.current.x / previousSize.width) * width,
          y: (currentRef.current.y / previousSize.height) * height,
        };
        targetRef.current = {
          x: (targetRef.current.x / previousSize.width) * width,
          y: (targetRef.current.y / previousSize.height) * height,
        };
      }
    });
    resizeObserver.observe(scene);

    let running = true;
    let lastVisualUpdate = 0;
    let facing: 1 | -1 = 1;
    const renderFrame = (now: number) => {
      if (!running) return;
      const current = currentRef.current;
      const target = targetRef.current;
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const easing = reducedMotionRef.current ? 1 : 0.075;
      const travelSpeed = Math.hypot(dx, dy) * easing;
      current.x += dx * easing;
      current.y += dy * easing;
      pointerMotionRef.current.speed *= 0.93;
      if (dx < -0.4) facing = -1;
      else if (dx > 0.4) facing = 1;

      const { width, height } = sizeRef.current;
      if (width && height && now - lastVisualUpdate >= 32) {
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
        setMermaidVisual({
          x: current.x,
          y: current.y,
          width: clamp(width * 0.3, 240, 380),
          facing,
          travelSpeed,
          shadow: projected,
        });
        lastVisualUpdate = now;
      }

      if (width && height && !pinnedIdRef.current) {
        let nearest: InteractiveSeaObjectData | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const object of interactiveObjects) {
          const objectPoint = {
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
      if (event.key !== "Escape") return;
      if (showAllDetails) closeAllDetails();
      else if (activeIdRef.current) closeActiveDetail();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeActiveDetail, closeAllDetails, showAllDetails]);

  const activeObject = interactiveObjects.find((object) => object.id === activeId);
  const mermaidAction: MermaidAction = discovering
    ? "discover"
    : mermaidVisual.travelSpeed > 1.4
      ? "swim"
      : "idle";

  return (
    <main
      ref={sceneRef}
      className="underwater-scene"
      data-dialog-open={showAllDetails || undefined}
      onPointerDown={(event) => {
        if (showAllDetails) return;
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
      <img
        className="underwater-background"
        src="/images/underwater/background-main.png"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <AmbientLayers />

      <header className="title-bubble">
        <p className="title-eyebrow">{eventDetails.eyebrow}</p>
        <h1>
          <span className="title-name">{eventDetails.celebrantName}’s</span>
          <span className="title-occasion">First Birthday</span>
        </h1>
        <p className="title-subtitle">A magical under-the-sea invitation</p>
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
            onActivate={activateObject}
          />
        ))}
      </div>

      <MermaidCharacter
        action={mermaidAction}
        facing={mermaidVisual.facing}
        shadow={mermaidVisual.shadow}
        width={mermaidVisual.width}
        x={mermaidVisual.x}
        y={mermaidVisual.y}
      />
      {activeObject ? (
        <BubbleMessage object={activeObject} onClose={closeActiveDetail} />
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
    </main>
  );
}
