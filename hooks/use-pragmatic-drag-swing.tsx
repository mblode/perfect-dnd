"use client";

import { useCallback, useEffect, useRef } from "react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { createSpring, type Spring } from "@/lib/spring";

interface PragmaticDragSwingConfig {
  /** How much velocity affects rotation (deg per px/frame). Default: 0.3 */
  sensitivity?: number;
  /** Maximum rotation in degrees. Default: 30 */
  maxAngle?: number;
  /** Velocity smoothing (0-1, higher = more responsive, lower = heavier feel). Default: 0.15 */
  smoothing?: number;
  /** Spring stiffness for return animation. Default: 250 */
  returnStiffness?: number;
  /** Spring damping for return animation. Default: 25 */
  returnDamping?: number;
}

interface UsePragmaticDragSwingReturn {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  scaleRef: React.RefObject<HTMLDivElement | null>;
}

// Utility functions
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function usePragmaticDragSwing(
  config: PragmaticDragSwingConfig = {},
): UsePragmaticDragSwingReturn {
  const {
    sensitivity = 0.3,
    maxAngle = 30,
    smoothing = 0.15,
    returnStiffness = 250,
    returnDamping = 25,
  } = config;

  const overlayRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);

  // Spring for rotation animation
  const springRef = useRef<Spring | null>(null);

  // Position tracking for velocity calculation - uses absolute clientX
  const lastClientXRef = useRef<number>(0);
  const smoothedVelocityRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  // Drag state tracking
  const isDraggingRef = useRef<boolean>(false);
  const dragLoopRef = useRef<number | null>(null);

  // Initialize spring
  useEffect(() => {
    springRef.current = createSpring({
      stiffness: returnStiffness,
      damping: returnDamping,
    });
  }, [returnStiffness, returnDamping]);

  // Update CSS custom property
  const updateRotation = useCallback((value: number) => {
    if (overlayRef.current) {
      overlayRef.current.style.setProperty("--motion-rotate", `${value}deg`);
    }
  }, []);

  // Continuous physics loop - runs spring simulation every frame
  const runDragLoop = useCallback(() => {
    if (!isDraggingRef.current || !springRef.current) return;

    // Calculate delta time
    const now = performance.now();
    const dt = Math.min((now - lastFrameTimeRef.current) / 1000, 0.064);
    lastFrameTimeRef.current = now;

    // Advance spring physics (momentum preserved!)
    springRef.current.tick(dt);

    // Update rotation from spring value
    updateRotation(springRef.current.getValue());

    // Continue loop
    dragLoopRef.current = requestAnimationFrame(runDragLoop);
  }, [updateRotation]);

  // Apply initial scale/shadow and start physics loop on mount
  // (component mounts after drag starts, so we initialize here)
  useEffect(() => {
    // Initialize drag state and timing
    isDraggingRef.current = true;
    lastFrameTimeRef.current = performance.now();

    // Set grabbing cursor on body (Bug 3 fix)
    document.body.style.cursor = "grabbing";

    // Wait for next frame to ensure DOM is ready (Bug 2 fix)
    const animationRafId = requestAnimationFrame(() => {
      const cardElement = overlayRef.current?.querySelector(
        "[data-overlay-card]",
      ) as HTMLElement | null;

      // Animate scale on the scale wrapper
      if (scaleRef.current) {
        scaleRef.current.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.04)" }],
          {
            duration: 200,
            easing: "cubic-bezier(.2, 0, 0, 1)",
            fill: "forwards",
          },
        );
      }

      // Animate shadow on the card element
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
    });

    // Start the physics loop
    dragLoopRef.current = requestAnimationFrame(runDragLoop);

    return () => {
      document.body.style.cursor = "";
      cancelAnimationFrame(animationRafId);
      if (dragLoopRef.current) {
        cancelAnimationFrame(dragLoopRef.current);
      }
    };
  }, [runDragLoop]);

  // Monitor for drag events using Pragmatic DnD's monitorForElements
  useEffect(() => {
    const cleanup = monitorForElements({
      onDragStart({ location }) {
        // Reset tracking state with initial position
        // Note: Physics loop is started by the mount effect, not here
        lastClientXRef.current = location.current.input.clientX;
        smoothedVelocityRef.current = 0;
      },

      onDrag({ location }) {
        if (!springRef.current) return;

        const currentClientX = location.current.input.clientX;

        // Instantaneous velocity = position change since last frame
        const instantVelocity = currentClientX - lastClientXRef.current;
        lastClientXRef.current = currentClientX;

        // Smooth the velocity
        smoothedVelocityRef.current = lerp(
          smoothedVelocityRef.current,
          instantVelocity,
          smoothing,
        );

        // Dead zone - ignore tiny velocity to prevent jitter during slow movement
        const effectiveVelocity =
          Math.abs(smoothedVelocityRef.current) < 0.3
            ? 0
            : smoothedVelocityRef.current;

        // Map velocity directly to rotation angle
        const targetRotation = clamp(
          -effectiveVelocity * sensitivity,
          -maxAngle,
          maxAngle,
        );

        // Just set the target - physics loop handles animation with momentum
        springRef.current.setTarget(targetRotation);
      },

      onDrop() {
        // Stop the drag loop
        // Note: Cursor reset is handled by useEffect cleanup, not here
        isDraggingRef.current = false;
        if (dragLoopRef.current) {
          cancelAnimationFrame(dragLoopRef.current);
          dragLoopRef.current = null;
        }

        // Reset tracking state
        smoothedVelocityRef.current = 0;
        // Note: Settling logic is handled in pragmatic-dnd-page.tsx for clean handoff
      },
    });

    return cleanup;
  }, [sensitivity, maxAngle, smoothing, runDragLoop]);

  return { overlayRef, scaleRef };
}
