"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { UseDragSwingOptions } from "@/hooks/use-drag-swing";
import { useDragSwing } from "@/hooks/use-drag-swing";
import type { BlockData } from "@/types/block";

import { DragOverlayCard } from "./drag-overlay-card";

interface DragSwingOverlayProps extends UseDragSwingOptions {
  block: BlockData;
}

/**
 * The card while it is held: scale on the outer element, tilt on the inner
 * one, so the two springs never overwrite each other's transform.
 *
 * The card is measured once and then taken out of flow, so tilting it cannot
 * change the height of the overlay and shift the list underneath.
 */
export function DragSwingOverlay({ block, onRelease }: DragSwingOverlayProps) {
  const { overlayRef, scaleRef } = useDragSwing({ onRelease });

  const measureRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (height === null && measureRef.current) {
      setHeight(measureRef.current.getBoundingClientRect().height);
    }
  }, [height]);

  return (
    <div className="relative w-full" style={{ height: height ?? undefined }}>
      <div
        className="top-0 left-0 w-full origin-center"
        ref={scaleRef}
        style={{
          position: height === null ? "relative" : "absolute",
          transform: "scale(var(--motion-scale, 1))",
        }}
      >
        <div
          className="w-full origin-center"
          ref={overlayRef}
          style={{ transform: "rotate(var(--motion-rotate, 0deg))" }}
        >
          <DragOverlayCard block={block} ref={measureRef} />
        </div>
      </div>
    </div>
  );
}
