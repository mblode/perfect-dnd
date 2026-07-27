"use client";

import type { Ref } from "react";

import { overlayCardMarker } from "@/lib/dnd/dom";
import type { BlockData } from "@/types/block";

import { CardInner } from "./card-inner";

interface DragOverlayCardProps {
  block: BlockData;
  ref?: Ref<HTMLDivElement>;
}

/** The card as it looks while held. Its shadow is animated by `useDragSwing`. */
export function DragOverlayCard({ block, ref }: DragOverlayCardProps) {
  return (
    <div
      className="cursor-grabbing rounded-xl border border-border bg-white p-4"
      ref={ref}
      {...overlayCardMarker()}
    >
      <CardInner block={block} />
    </div>
  );
}
