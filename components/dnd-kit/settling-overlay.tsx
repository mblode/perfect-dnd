"use client";

import { useLayoutEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import {
  createLiveSpring,
  POSITION_SPRING_CONFIG,
} from "@/lib/spring";
import { useStore } from "@/lib/stores/store";
import type { BlockData } from "@/types/block";
import { CardInner } from "./card-inner";

interface SettlingOverlayProps {
  block: BlockData;
  onAnimationComplete: () => void;
}

export const SettlingOverlay = observer(
  ({ block, onAnimationComplete }: SettlingOverlayProps) => {
    const store = useStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);

    const rect = store.dropAnimationRect;
    const rotation = store.dropAnimationRotation;
    const scale = store.dropAnimationScale;
    const dragSwingSettings = store.dragSwingSettings;

    useLayoutEffect(() => {
      if (
        !rect ||
        !containerRef.current ||
        !wrapperRef.current ||
        !cardRef.current
      )
        return;

      // Find the target content-card position
      const targetElement = document.querySelector(
        `[data-settling-target="${block.id}"]`,
      ) as HTMLElement | null;

      if (!targetElement) {
        // No target found, just complete immediately
        onAnimationComplete();
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;
      const targetLeft = targetCenterX - rect.width / 2;
      const targetTop = targetCenterY - rect.height / 2;

      const xSpring = createLiveSpring(POSITION_SPRING_CONFIG);
      const ySpring = createLiveSpring(POSITION_SPRING_CONFIG);
      const rotationSpring = createLiveSpring({
        stiffness: dragSwingSettings.rotationSpring.stiffness,
        damping: dragSwingSettings.rotationSpring.damping,
        mass: dragSwingSettings.rotationSpring.mass,
        restSpeed: dragSwingSettings.rotationSpring.restSpeed,
        restDistance: dragSwingSettings.rotationSpring.restDistance,
      });
      const scaleSpring = createLiveSpring({
        stiffness: dragSwingSettings.scaleSpring.stiffness,
        damping: dragSwingSettings.scaleSpring.damping,
        restSpeed: dragSwingSettings.scaleSpring.restSpeed,
        restDistance: dragSwingSettings.scaleSpring.restDistance,
      });

      xSpring.setCurrent(rect.left);
      xSpring.setTarget(targetLeft);
      ySpring.setCurrent(rect.top);
      ySpring.setTarget(targetTop);
      rotationSpring.setCurrent(rotation);
      rotationSpring.setTarget(0);
      scaleSpring.setCurrent(scale);
      scaleSpring.setTarget(1);

      // Shadow fade (linear, no spring needed)
      const currentShadow =
        "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 12px 24px -8px rgba(0, 0, 0, 0.1)";
      const noShadow =
        "0 25px 50px -12px rgba(0, 0, 0, 0), 0 12px 24px -8px rgba(0, 0, 0, 0)";

      const shadowAnimation = cardRef.current.animate(
        [{ boxShadow: currentShadow }, { boxShadow: noShadow }],
        {
          duration: 200,
          easing: "ease-out",
          fill: "forwards",
        },
      );

      let settleStartTime: number | null = null;
      let settleFrameCount = 0;
      let didComplete = false;
      const MAX_SETTLE_FRAMES = 120;
      const MAX_SETTLE_DURATION_MS = 2000;

      const finish = () => {
        if (didComplete) return;
        didComplete = true;
        onAnimationComplete();
      };

      const setFinalStyles = () => {
        if (containerRef.current) {
          containerRef.current.style.transform = `translate(${targetLeft}px, ${targetTop}px)`;
        }
        if (wrapperRef.current) {
          wrapperRef.current.style.transform = "scale(1) rotate(0deg)";
        }
      };

      const animate = () => {
        const now = performance.now();
        if (settleStartTime === null) {
          settleStartTime = now;
        }
        settleFrameCount += 1;

        if (
          settleFrameCount > MAX_SETTLE_FRAMES ||
          now - settleStartTime > MAX_SETTLE_DURATION_MS
        ) {
          setFinalStyles();
          finish();
          animationFrameRef.current = null;
          return;
        }

        const xState = xSpring.step(now);
        const yState = ySpring.step(now);
        const rotationState = rotationSpring.step(now);
        const scaleState = scaleSpring.step(now);

        if (containerRef.current) {
          containerRef.current.style.transform = `translate(${xState.value}px, ${yState.value}px)`;
        }
        if (wrapperRef.current) {
          wrapperRef.current.style.transform = `scale(${scaleState.value}) rotate(${rotationState.value}deg)`;
        }

        const allDone =
          xState.done && yState.done && rotationState.done && scaleState.done;

        if (allDone) {
          setFinalStyles();
          finish();
          animationFrameRef.current = null;
          return;
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      // Cleanup: cancel animations on unmount to prevent iOS Safari memory leaks
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        shadowAnimation.cancel();
      };
    }, [
      rect,
      rotation,
      scale,
      block.id,
      onAnimationComplete,
      dragSwingSettings.rotationSpring.stiffness,
      dragSwingSettings.rotationSpring.damping,
      dragSwingSettings.rotationSpring.mass,
      dragSwingSettings.rotationSpring.restSpeed,
      dragSwingSettings.rotationSpring.restDistance,
      dragSwingSettings.scaleSpring.stiffness,
      dragSwingSettings.scaleSpring.damping,
      dragSwingSettings.scaleSpring.restSpeed,
      dragSwingSettings.scaleSpring.restDistance,
    ]);

    if (!rect) return null;

    return (
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: rect.width,
          height: rect.height,
          transform: `translate(${rect.left}px, ${rect.top}px)`,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <div
          ref={wrapperRef}
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
          }}
        >
          <div
            ref={cardRef}
            className="rounded-xl border border-border bg-white p-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15),0_12px_24px_-8px_rgba(0,0,0,0.1)]"
          >
            <CardInner block={block} />
          </div>
        </div>
      </div>
    );
  },
);

SettlingOverlay.displayName = "SettlingOverlay";
