"use client";

/* eslint-disable @next/next/no-img-element -- generated transparent scene layers use direct responsive sizing */

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { eventDetails } from "@/data/eventDetails";
import { interactiveObjects, type InteractiveSeaObjectData } from "@/data/interactiveObjects";
import { clamp, distanceBetween } from "@/lib/distance";
import { AmbientLayers } from "./AmbientLayers";
import { BubbleMessage } from "./BubbleMessage";
import { InteractiveSeaObject } from "./InteractiveSeaObject";
import { MermaidCharacter } from "./MermaidCharacter";
import { PartyDetailsDialog } from "./PartyDetailsDialog";

type Point = { x: number; y: number };
const START_POSITION = { x: 50, y: 49 } as const;
const MERMAID_EDGE_PADDING = 58;

export function UnderwaterScene() {
  const sceneRef = useRef<HTMLElement>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const draggingPointerRef = useRef<number | null>(null);
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
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const updateActiveId = useCallback((nextId: string | null) => {
    if (activeIdRef.current === nextId) return;
    activeIdRef.current = nextId;
    setActiveId(nextId);
  }, []);

  const setTargetPoint = useCallback((x: number, y: number) => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return;
    const topPadding = Math.min(164, Math.max(112, height * 0.2));
    targetRef.current = {
      x: clamp(x, MERMAID_EDGE_PADDING, width - MERMAID_EDGE_PADDING),
      y: clamp(y, topPadding, height - MERMAID_EDGE_PADDING),
    };
    setHasMoved(true);
  }, []);

  const moveTargetFromPointer = useCallback((event: ReactPointerEvent<HTMLElement>) => {
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
  }, [setTargetPoint]);

  const activateObject = useCallback((object: InteractiveSeaObjectData) => {
    const { width, height } = sizeRef.current;
    pinnedIdRef.current = object.id;
    dismissedIdRef.current = null;
    updateActiveId(object.id);
    setTargetPoint((object.x / 100) * width, (object.y / 100) * height);
  }, [setTargetPoint, updateActiveId]);

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
    const mermaid = mermaidRef.current;
    if (!scene || !mermaid) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => { reducedMotionRef.current = motionQuery.matches; };
    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);

    const resizeObserver = new ResizeObserver(([entry]) => {
      const previousSize = sizeRef.current;
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      sizeRef.current = { width, height };

      if (!previousSize.width || !previousSize.height) {
        currentRef.current = { x: (START_POSITION.x / 100) * width, y: (START_POSITION.y / 100) * height };
        targetRef.current = { ...currentRef.current };
      } else {
        currentRef.current = { x: (currentRef.current.x / previousSize.width) * width, y: (currentRef.current.y / previousSize.height) * height };
        targetRef.current = { x: (targetRef.current.x / previousSize.width) * width, y: (targetRef.current.y / previousSize.height) * height };
      }
    });
    resizeObserver.observe(scene);

    let running = true;
    let tailFrame = 0;
    let lastTailToggle = 0;
    let fleeMeasureFrame = 0;
    let previousFrameTime = 0;
    const fishFlights = Array.from(scene.querySelectorAll<HTMLElement>("[data-flee-fish]")).map((fish) => ({
      fish,
      track: fish.closest<HTMLElement>(".ambient-fish-track"),
      offsetX: 0,
      offsetY: 0,
      velocityX: 0,
      velocityY: 0,
      fleeingUntil: 0,
      cooldownUntil: 0,
      distance: Number.POSITIVE_INFINITY,
    }));
    const renderFishFlight = (flight: (typeof fishFlights)[number], flip: number, energy: number) => {
      flight.fish.style.setProperty("--flee-x", `${flight.offsetX}px`);
      flight.fish.style.setProperty("--flee-y", `${flight.offsetY}px`);
      flight.fish.style.setProperty("--flee-flip", `${flip}`);
      flight.fish.style.setProperty("--flee-energy", `${energy}`);
    };
    const sampleFishThreats = (current: Point, now: number) => {
      const sceneBounds = scene.getBoundingClientRect();
      const measurements = fishFlights.map((flight, index) => {
        const bounds = flight.fish.getBoundingClientRect();
        const fishX = bounds.left - sceneBounds.left + bounds.width / 2;
        const fishY = bounds.top - sceneBounds.top + bounds.height / 2;
        const awayX = fishX - current.x;
        const awayY = fishY - current.y;
        const distance = Math.max(1, Math.hypot(awayX, awayY));
        return { flight, index, bounds, awayX, awayY, distance };
      });
      for (const { flight, index, bounds, awayX, awayY, distance } of measurements) {
        flight.distance = distance;
        if (flight.track && (bounds.right < -140 || bounds.left > sceneBounds.width + 140)) {
          flight.offsetX = 0;
          flight.offsetY = 0;
          renderFishFlight(flight, 1, 0);
        }
        if (distance >= 190 || now < flight.cooldownUntil || now < flight.fleeingUntil) continue;

        const strength = clamp((190 - distance) / 190, 0, 1);
        let directionX = awayX / distance;
        let directionY = awayY / distance;
        if (Math.abs(directionX) < 0.7) {
          directionX = Math.sign(directionX || (index % 2 === 0 ? 1 : -1)) * 0.7;
          directionY = Math.sign(directionY || -1) * Math.sqrt(1 - directionX * directionX);
        }
        const burstSpeed = 13 + strength * 8;
        flight.velocityX = directionX * burstSpeed;
        flight.velocityY = directionY * burstSpeed * 0.68;
        flight.fleeingUntil = now + 560;
        flight.cooldownUntil = now + 1700;
        if (flight.track) flight.track.style.animationPlayState = "paused";
      }
    };

    const renderFrame = (now: number) => {
      if (!running) return;
      const frameScale = clamp((now - previousFrameTime) / 16.67, 0.5, 2);
      previousFrameTime = now;
      const current = currentRef.current;
      const target = targetRef.current;
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const easing = reducedMotionRef.current ? 1 : 0.075;
      const travelSpeed = Math.hypot(dx, dy) * easing;
      current.x += dx * easing;
      current.y += dy * easing;

      pointerMotionRef.current.speed *= 0.93;
      const swimEnergy = reducedMotionRef.current
        ? 0
        : clamp(Math.max(pointerMotionRef.current.speed / 1.35, travelSpeed / 17), 0, 1);
      const flapInterval = 920 - swimEnergy * 780;
      if (lastTailToggle === 0) lastTailToggle = now;
      if (!reducedMotionRef.current && now - lastTailToggle >= flapInterval) {
        tailFrame = tailFrame === 0 ? 1 : 0;
        lastTailToggle = now;
      } else if (reducedMotionRef.current) {
        tailFrame = 0;
      }
      mermaid.dataset.tailFrame = `${tailFrame}`;
      mermaid.style.setProperty("--swim-energy", `${swimEnergy}`);

      const flip = dx < -0.4 ? -1 : 1;
      const tilt = reducedMotionRef.current ? 0 : clamp(dy * 0.045, -10, 10);
      mermaid.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%) rotate(${tilt}deg) scaleX(${flip})`;

      for (const flight of fishFlights) {
        if (now < flight.fleeingUntil) {
          flight.offsetX += flight.velocityX * frameScale;
          flight.offsetY += flight.velocityY * frameScale;
          flight.velocityX *= Math.pow(0.982, frameScale);
          flight.velocityY *= Math.pow(0.982, frameScale);
          renderFishFlight(flight, flight.velocityX < 0 ? -1 : 1, 1);
        } else if (flight.track) {
          flight.track.style.animationPlayState = "running";
          renderFishFlight(flight, 1, 0);
        } else if (flight.distance > 220 && Math.hypot(flight.offsetX, flight.offsetY) > 1) {
          const returnRate = Math.pow(0.94, frameScale);
          const returnDirection = flight.offsetX > 0 ? -1 : 1;
          flight.offsetX *= returnRate;
          flight.offsetY *= returnRate;
          renderFishFlight(flight, returnDirection, 0.35);
        }
      }
      fleeMeasureFrame = (fleeMeasureFrame + 1) % 6;
      if (fleeMeasureFrame === 0) sampleFishThreats(current, now);

      const { width, height } = sizeRef.current;
      if (width && height && !pinnedIdRef.current) {
        let nearest: InteractiveSeaObjectData | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (const object of interactiveObjects) {
          const objectPoint = { x: (object.x / 100) * width, y: (object.y / 100) * height };
          const distance = distanceBetween(current, objectPoint);
          const radius = Math.min(object.radius, Math.max(76, Math.min(width, height) * 0.15));

          if (dismissedIdRef.current === object.id && distance > radius * 1.18) dismissedIdRef.current = null;
          if (distance < radius && object.id !== dismissedIdRef.current && distance < nearestDistance) {
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
    const handleVisibilityChange = () => { if (document.hidden) stopAnimation(); else startAnimation(); };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startAnimation();
    return () => {
      stopAnimation();
      resizeObserver.disconnect();
      motionQuery.removeEventListener("change", syncMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updateActiveId]);

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
        if (event.pointerType === "mouse" || draggingPointerRef.current === event.pointerId) moveTargetFromPointer(event);
      }}
      onPointerUp={(event) => { if (draggingPointerRef.current === event.pointerId) draggingPointerRef.current = null; }}
      onPointerCancel={() => { draggingPointerRef.current = null; }}
    >
      <div className="underwater-background" aria-hidden="true" />
      <AmbientLayers />

      <div className="scene-frame" aria-hidden="true">
        <img className="frame-art frame-plant-left" src="/images/sea-elements/sea-plant.png" alt="" />
        <img className="frame-art frame-rock-left" src="/images/sea-elements/rock-cluster.png" alt="" />
        <img className="frame-art frame-clam-right" src="/images/sea-elements/pearl-clam.png" alt="" />
        <img className="frame-art frame-plant-right" src="/images/sea-elements/sea-plant.png" alt="" />
      </div>

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
          <InteractiveSeaObject key={object.id} object={object} active={activeId === object.id} onActivate={activateObject} />
        ))}
      </div>

      <MermaidCharacter ref={mermaidRef} />
      {activeObject ? <BubbleMessage object={activeObject} onClose={closeActiveDetail} /> : null}

      <button type="button" className="all-details-button" onClick={openAllDetails}>
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
