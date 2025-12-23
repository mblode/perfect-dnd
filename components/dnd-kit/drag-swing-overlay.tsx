"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useDragSwing } from "@/hooks/use-drag-swing";
import type { BlockData } from "@/types/block";
import { DragOverlayCard } from "./drag-overlay-card";

interface DragSwingOverlayProps {
  block: BlockData;
}

export function DragSwingOverlay({ block }: DragSwingOverlayProps) {
  const { overlayRef, scaleRef } = useDragSwing();

  const measureRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (measureRef.current && !size) {
      const rect = measureRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }
  }, [size]);

  return (
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
          transform: "scale(var(--motion-scale, 1))",
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
  );
}
