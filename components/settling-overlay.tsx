"use client";

import { useLayoutEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
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

    const rect = store.dropAnimationRect;
    const rotation = store.dropAnimationRotation;

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

      // Spring easing with subtle overshoot
      const springEasing = "cubic-bezier(.25, .75, .30, 1)";

      // Animate position from captured rect to target rect
      const positionAnimation = containerRef.current.animate(
        [
          { transform: `translate(${rect.left}px, ${rect.top}px)` },
          { transform: `translate(${targetRect.left}px, ${targetRect.top}px)` },
        ],
        {
          duration: 500,
          easing: springEasing,
          fill: "forwards",
        },
      );

      // Animate scale and rotation on the wrapper (rotation layer)
      wrapperRef.current.animate(
        [
          { transform: `rotate(${rotation}deg) scale(1.04)` },
          { transform: "rotate(0deg) scale(1)" },
        ],
        {
          duration: 500,
          easing: springEasing,
          fill: "forwards",
        },
      );

      // Animate shadow fade on the card
      const currentShadow =
        "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 12px 24px -8px rgba(0, 0, 0, 0.1)";
      const noShadow =
        "0 25px 50px -12px rgba(0, 0, 0, 0), 0 12px 24px -8px rgba(0, 0, 0, 0)";

      cardRef.current.animate(
        [{ boxShadow: currentShadow }, { boxShadow: noShadow }],
        {
          duration: 500,
          easing: springEasing,
          fill: "forwards",
        },
      );

      positionAnimation.onfinish = () => {
        onAnimationComplete();
      };
    }, [rect, rotation, block.id, onAnimationComplete]);

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
            transform: `rotate(${rotation}deg) scale(1.04)`,
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
