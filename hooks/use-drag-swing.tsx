"use client";

import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import { useDndMonitor } from "@dnd-kit/core";
import { useCallback, useEffect, useRef } from "react";
import { createSpring, animateSpring, type Spring } from "@/lib/spring";
import { useStore } from "@/lib/stores/store";

interface DragSwingConfig {
  /** How much velocity affects rotation (deg per px/frame). Default: 0.3 */
  sensitivity?: number;
  /** Maximum rotation in degrees. Default: 12 */
  maxAngle?: number;
  /** Velocity smoothing (0-1, higher = more responsive, lower = heavier feel). Default: 0.15 */
  smoothing?: number;
  /** Spring stiffness for return animation. Default: 200 */
  returnStiffness?: number;
  /** Spring damping for return animation. Default: 22 */
  returnDamping?: number;
}

interface UseDragSwingReturn {
  overlayRef: React.RefObject<HTMLDivElement | null>;
}

// Utility functions
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function useDragSwing(config: DragSwingConfig = {}): UseDragSwingReturn {
  const {
    sensitivity = 0.3,
    maxAngle = 12,
    smoothing = 0.15,
    returnStiffness = 200,
    returnDamping = 22,
  } = config;

  const store = useStore();

  const overlayRef = useRef<HTMLDivElement>(null);

  // Spring for rotation animation
  const springRef = useRef<Spring | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Position tracking for velocity calculation
  const lastXRef = useRef<number>(0);
  const smoothedVelocityRef = useRef<number>(0);

  // Accessibility
  const prefersReducedMotionRef = useRef<boolean>(false);

  // Initialize spring
  useEffect(() => {
    springRef.current = createSpring({
      stiffness: returnStiffness,
      damping: returnDamping,
    });
  }, [returnStiffness, returnDamping]);

  // Check reduced motion preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mql.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // Update CSS custom property
  const updateRotation = useCallback((value: number) => {
    if (overlayRef.current) {
      overlayRef.current.style.setProperty("--motion-rotate", `${value}deg`);
    }
  }, []);

  // Start spring animation
  const startSpringAnimation = useCallback(() => {
    if (!springRef.current) return;

    // Cancel any existing animation
    cleanupRef.current?.();

    cleanupRef.current = animateSpring(springRef.current, updateRotation);
  }, [updateRotation]);

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    // Reset tracking state
    lastXRef.current = 0;
    smoothedVelocityRef.current = 0;

    if (prefersReducedMotionRef.current) return;

    // Animate shadow on the card element
    const cardElement = overlayRef.current?.querySelector(
      "[data-overlay-card]"
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
        }
      );
    }

    // Animate scale on the wrapper
    if (overlayRef.current) {
      overlayRef.current.animate(
        [
          { transform: "rotate(0deg) scale(1)" },
          { transform: "rotate(0deg) scale(1.04)" },
        ],
        {
          duration: 200,
          easing: "cubic-bezier(.2, 0, 0, 1)",
          fill: "forwards",
        }
      );
    }
  }, []);

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (prefersReducedMotionRef.current) return;
      if (!springRef.current) return;

      const currentX = event.delta.x;

      // Instantaneous velocity = position change since last frame
      const instantVelocity = currentX - lastXRef.current;
      lastXRef.current = currentX;

      // Smooth the velocity using exponential smoothing
      smoothedVelocityRef.current = lerp(
        smoothedVelocityRef.current,
        instantVelocity,
        smoothing
      );

      // Map velocity directly to rotation angle
      const targetRotation = clamp(
        smoothedVelocityRef.current * sensitivity,
        -maxAngle,
        maxAngle
      );

      // Set the target and update immediately
      springRef.current.setTarget(targetRotation);
      startSpringAnimation();
    },
    [sensitivity, maxAngle, smoothing, startSpringAnimation]
  );

  const handleDragEnd = useCallback(
    (_event: DragEndEvent) => {
      if (!springRef.current) return;

      // Stop any running spring animation
      cleanupRef.current?.();
      cleanupRef.current = null;

      // Get current rotation value from spring
      const currentRotation = springRef.current.getValue();

      // Capture the overlay position for the settling animation
      // We need to find the actual card element inside the overlay
      const cardElement = overlayRef.current?.querySelector(
        "[data-overlay-card]"
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
        store.startSettling(unscaledRect, currentRotation);
      }

      // Reset tracking state
      smoothedVelocityRef.current = 0;
    },
    [store]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  useDndMonitor({
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragEnd,
  });

  return { overlayRef };
}
