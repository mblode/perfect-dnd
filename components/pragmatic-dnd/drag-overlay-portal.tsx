"use client";

import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { usePragmaticDragSwing } from "@/hooks/use-pragmatic-drag-swing";
import type { BlockData } from "@/types/block";
import { DragOverlayCard } from "./drag-overlay-card";

interface DragOverlayPortalProps {
  block: BlockData;
  initialPosition: { x: number; y: number };
  initialOffset: { x: number; y: number };
  sourceWidth: number;
}

export function DragOverlayPortal({
  block,
  initialPosition,
  initialOffset,
  sourceWidth,
}: DragOverlayPortalProps) {
  const { overlayRef, scaleRef } = usePragmaticDragSwing({
    sensitivity: 0.5,
    maxAngle: 20,
    smoothing: 0.12,
    returnStiffness: 220,
    returnDamping: 22,
  });

  const measureRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState(initialPosition);

  // Client-side only mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Measure card dimensions on first layout pass
  useLayoutEffect(() => {
    if (measureRef.current && !size) {
      const rect = measureRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }
  }, [size]);

  // Track cursor position via monitorForElements
  useEffect(() => {
    const cleanup = monitorForElements({
      onDrag({ location }) {
        setPosition({
          x: location.current.input.clientX - initialOffset.x,
          y: location.current.input.clientY - initialOffset.y,
        });
      },
    });
    return cleanup;
  }, [initialOffset]);

  if (!mounted) return null;

  const overlay = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex: 10000,
        pointerEvents: "none",
        width: sourceWidth,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: size?.height,
        }}
      >
        <div
          ref={scaleRef}
          style={{
            position: size ? "absolute" : "relative",
            top: 0,
            left: 0,
            width: "100%",
            transformOrigin: "center center",
          }}
        >
          <div
            ref={overlayRef}
            style={{
              width: "100%",
              transform: "rotate(var(--motion-rotate, 0deg))",
              transformOrigin: "center center",
            }}
          >
            <DragOverlayCard ref={measureRef} block={block} />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
