"use client";

import type {
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { useDndMonitor } from "@dnd-kit/core";
import { useCallback, useEffect, useRef } from "react";
import {
  calculateVelocityFromHistory,
  createLiveSpring,
  type PointWithTimestamp,
  SCALE_SPRING_CONFIG,
  SPRING_DEFAULTS,
  VELOCITY_WINDOW_MS,
  velocityToRotation,
} from "@/lib/spring";
import { getPointerPosition } from "@/lib/dnd/pointer-tracker";
import { useStore } from "@/lib/stores/store";

interface UseDragSwingReturn {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  scaleRef: React.RefObject<HTMLDivElement | null>;
}

export function useDragSwing(): UseDragSwingReturn {
  const store = useStore();

  const overlayRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);

  const springAnimationFrameRef = useRef<number | null>(null);
  const positionHistoryRef = useRef<PointWithTimestamp[]>([]);
  const isDraggingRef = useRef(false);
  const isSettlingRef = useRef(false);
  const settleStartTimeRef = useRef<number | null>(null);
  const settleFrameCountRef = useRef(0);
  const dragStartPointerRef = useRef<{ x: number; y: number } | null>(null);
  const currentRotationRef = useRef(0);
  const currentScaleRef = useRef(1);

  // Live spring instances for continuous animation (like Framer Motion's useSpring)
  const rotationSpringRef = useRef(
    createLiveSpring({
      stiffness: SPRING_DEFAULTS.stiffness,
      damping: SPRING_DEFAULTS.damping,
      mass: SPRING_DEFAULTS.mass,
      restSpeed: 2,
      restDistance: 0.5,
    }),
  );
  const scaleSpringRef = useRef(
    createLiveSpring({
      stiffness: SCALE_SPRING_CONFIG.stiffness,
      damping: SCALE_SPRING_CONFIG.damping,
      restSpeed: SCALE_SPRING_CONFIG.restSpeed,
      restDistance: 0.001, // Scale changes by 0.02, need tiny restDistance (not 0.5 default)
    }),
  );

  // Update CSS custom properties
  const updateRotation = useCallback((value: number) => {
    if (overlayRef.current) {
      overlayRef.current.style.setProperty("--motion-rotate", `${value}deg`);
    }
  }, []);

  const updateScale = useCallback((value: number) => {
    if (scaleRef.current) {
      scaleRef.current.style.setProperty("--motion-scale", `${value}`);
    }
  }, []);

  /**
   * Start continuous spring animation loop
   * This matches swing-card.tsx useSpring behavior - continuously smoothing values
   */
  const startSpringAnimation = useCallback(() => {
    if (springAnimationFrameRef.current !== null) {
      return;
    }

    const rotationSpring = rotationSpringRef.current;
    const scaleSpring = scaleSpringRef.current;

    // Initialize springs with current state
    rotationSpring.setCurrent(currentRotationRef.current);
    scaleSpring.setCurrent(currentScaleRef.current);

    // Safety guard: maximum settling duration (2 seconds at 60fps = 120 frames)
    // This prevents infinite loops if springs never settle
    const MAX_SETTLE_FRAMES = 120;
    const MAX_SETTLE_DURATION_MS = 2000;

    const animate = () => {
      const now = performance.now();
      if (isSettlingRef.current) {
        if (settleStartTimeRef.current === null) {
          settleStartTimeRef.current = now;
          settleFrameCountRef.current = 0;
        }
        settleFrameCountRef.current += 1;
        const settleDuration = now - settleStartTimeRef.current;

        // Safety check: force exit if settling runs too long
        if (
          settleFrameCountRef.current > MAX_SETTLE_FRAMES ||
          settleDuration > MAX_SETTLE_DURATION_MS
        ) {
          isSettlingRef.current = false;
          settleStartTimeRef.current = null;
          settleFrameCountRef.current = 0;
          rotationSpring.setCurrent(0);
          rotationSpring.setTarget(0);
          scaleSpring.setCurrent(1);
          scaleSpring.setTarget(1);
          updateRotation(0);
          updateScale(1);
          springAnimationFrameRef.current = null;
          return;
        }
      }

      const rotationState = rotationSpring.step(now);
      const scaleState = scaleSpring.step(now);

      currentRotationRef.current = rotationState.value;
      currentScaleRef.current = scaleState.value;
      updateRotation(rotationState.value);
      updateScale(scaleState.value);

      // Check if ALL springs are done
      const allSpringsDone = rotationState.done && scaleState.done;

      // Continue animation while dragging or if settling after drag
      if (
        isDraggingRef.current ||
        (isSettlingRef.current && !allSpringsDone)
      ) {
        springAnimationFrameRef.current = requestAnimationFrame(animate);
      } else {
        isSettlingRef.current = false;
        settleStartTimeRef.current = null;
        settleFrameCountRef.current = 0;
        springAnimationFrameRef.current = null;
      }
    };

    springAnimationFrameRef.current = requestAnimationFrame(animate);
  }, [updateRotation, updateScale]);

  /**
   * Update spring targets during drag
   * This matches swing-card.tsx behavior where rotateRaw.set() updates the target
   */
  const updateSpringTargets = useCallback(
    (targetRotation: number, targetScale: number) => {
      rotationSpringRef.current.setTarget(targetRotation);
      scaleSpringRef.current.setTarget(targetScale);
    },
    [],
  );

  // Apply initial scale/shadow and start physics loop on mount
  // (component mounts after drag starts, so handleDragStart won't fire)
  useEffect(() => {
    isDraggingRef.current = true;
    isSettlingRef.current = false;
    positionHistoryRef.current = [];
    settleStartTimeRef.current = null;
    settleFrameCountRef.current = 0;

    currentRotationRef.current = 0;
    currentScaleRef.current = 1;
    updateRotation(0);
    updateScale(1);

    // Set scale spring target directly (setState is async, so we can't rely on state being updated)
    // This matches swing-card.tsx handleDragStart: scaleRaw.set(1.04)
    scaleSpringRef.current.setTarget(1.04);

    // Start continuous spring animation (matches swing-card.tsx useSpring behavior)
    startSpringAnimation();

    // Animate shadow on the card element
    const cardElement = overlayRef.current?.querySelector(
      "[data-overlay-card]",
    ) as HTMLElement | null;

    if (cardElement) {
      cardElement.animate(
        [
          { boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
          {
            boxShadow:
              "0 25px 50px -12px rgba(0,0,0,0.15), 0 12px 24px -8px rgba(0,0,0,0.1)",
          },
        ],
        {
          duration: 200,
          easing: "cubic-bezier(.2, 0, 0, 1)",
          fill: "forwards",
        },
      );
    }
  }, [startSpringAnimation, updateRotation, updateScale]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activatorEvent = event.activatorEvent;

      const trackedPointer = getPointerPosition();
      if (trackedPointer) {
        dragStartPointerRef.current = trackedPointer;
      } else {
        let pointerX: number | null = null;
        let pointerY: number | null = null;
        if (activatorEvent instanceof MouseEvent) {
          pointerX = activatorEvent.clientX;
          pointerY = activatorEvent.clientY;
        } else if (
          activatorEvent instanceof TouchEvent &&
          activatorEvent.touches.length > 0
        ) {
          pointerX = activatorEvent.touches[0].clientX;
          pointerY = activatorEvent.touches[0].clientY;
        } else if (
          (activatorEvent as unknown as PointerEvent).clientX !== undefined
        ) {
          pointerX = (activatorEvent as unknown as PointerEvent).clientX;
          pointerY = (activatorEvent as unknown as PointerEvent).clientY;
        }

        dragStartPointerRef.current =
          pointerX !== null && pointerY !== null
            ? { x: pointerX, y: pointerY }
            : null;
      }

      positionHistoryRef.current = [];
      isDraggingRef.current = true;
      isSettlingRef.current = false;
      settleStartTimeRef.current = null;
      settleFrameCountRef.current = 0;

      // Set scale spring target directly (setState is async, so we can't rely on state being updated)
      // This matches swing-card.tsx handleDragStart: scaleRaw.set(1.04)
      scaleSpringRef.current.setTarget(1.04);

      // Start continuous spring animation (matches swing-card.tsx useSpring behavior)
      startSpringAnimation();
    },
    [startSpringAnimation],
  );

  /**
   * onDrag event handler
   * Uses Bento-style velocity-based rotation with 100ms sliding window
   */
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const now = performance.now();

      let pointerX = 0;
      let pointerY = 0;
      const dragStartPointer = dragStartPointerRef.current;
      const trackedPointer = getPointerPosition();

      if (trackedPointer) {
        pointerX = trackedPointer.x;
        pointerY = trackedPointer.y;
      } else if (dragStartPointer) {
        pointerX = dragStartPointer.x + event.delta.x;
        pointerY = dragStartPointer.y + event.delta.y;
      } else {
        const activatorEvent = event.activatorEvent;
        // Get pointer position from event for velocity tracking
        // This matches swing-card.tsx which uses info.point.x/y (pointer position)
        if (activatorEvent instanceof MouseEvent) {
          pointerX = activatorEvent.clientX;
          pointerY = activatorEvent.clientY;
        } else if (
          activatorEvent instanceof TouchEvent &&
          activatorEvent.touches.length > 0
        ) {
          pointerX = activatorEvent.touches[0].clientX;
          pointerY = activatorEvent.touches[0].clientY;
        } else if (
          (activatorEvent as unknown as PointerEvent).clientX !== undefined
        ) {
          pointerX = (activatorEvent as unknown as PointerEvent).clientX;
          pointerY = (activatorEvent as unknown as PointerEvent).clientY;
        }
      }

      // Track pointer position history for velocity calculation (100ms sliding window)
      let positionHistory: PointWithTimestamp[] = [
        ...positionHistoryRef.current,
        {
          x: pointerX,
          y: pointerY,
          timestamp: now,
        },
      ];

      // Keep only last 100ms of history
      positionHistory = positionHistory.filter(
        (entry) => now - entry.timestamp < VELOCITY_WINDOW_MS,
      );

      // Calculate velocity from history using Bento algorithm
      const velocity = calculateVelocityFromHistory(positionHistory);

      // Convert velocity to rotation using Bento formula
      // INVERTED: drag right = tilt left (negative rotation) due to inertia
      const targetRotation = velocityToRotation(velocity.x);

      // Update spring targets - spring will smoothly animate toward targetRotation
      // This matches swing-card.tsx: rotateRaw.set(targetRotation)
      updateSpringTargets(targetRotation, 1.04);

      positionHistoryRef.current = positionHistory;
    },
    [updateSpringTargets],
  );

  const handleDragEnd = useCallback(
    (_event: DragEndEvent) => {
      isDraggingRef.current = false;
      dragStartPointerRef.current = null;

      // Set spring targets to 0 (rotation) and 1 (scale)
      // This matches swing-card.tsx handleDragEnd: rotateRaw.set(0), scaleRaw.set(1)
      updateSpringTargets(0, 1);

      // Keep the spring loop alive while we settle back to rest.
      isSettlingRef.current = true;
      settleStartTimeRef.current = performance.now();
      settleFrameCountRef.current = 0;

      const cardElement = overlayRef.current?.querySelector(
        "[data-overlay-card]",
      ) as HTMLElement | null;
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect();
        // Compensate for scale(1.04) to get true unscaled dimensions
        // getBoundingClientRect returns scaled dimensions, so divide by scale factor
        const scale = 1.04;
        const unscaledRect = {
          top: rect.top,
          left: rect.left,
          width: rect.width / scale,
          height: rect.height / scale,
        };
        store.startSettling(unscaledRect, currentRotationRef.current);
      }

      positionHistoryRef.current = [];
      startSpringAnimation();
    },
    [startSpringAnimation, store, updateSpringTargets],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (springAnimationFrameRef.current) {
        cancelAnimationFrame(springAnimationFrameRef.current);
        springAnimationFrameRef.current = null;
      }
    };
  }, []);

  useDndMonitor({
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragEnd,
  });

  return { overlayRef, scaleRef };
}
