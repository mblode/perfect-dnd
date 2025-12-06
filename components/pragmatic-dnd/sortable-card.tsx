"use client";

import { useEffect, useRef, useMemo } from "react";
import { observer } from "mobx-react-lite";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { useStore } from "@/lib/stores/store";
import type { BlockData } from "@/types/block";
import { cn } from "@/lib/utils";
import { CardInner } from "./card-inner";

interface SortableCardProps {
  block: BlockData;
  index: number;
  sortedBlocks: BlockData[];
  onDragStart: (
    block: BlockData,
    rect: DOMRect,
    offset: { x: number; y: number },
  ) => void;
}

// Card height including margin (mb-2 = 8px)
const CARD_HEIGHT = 72;

export const SortableCard = observer(
  ({ block, index, sortedBlocks, onDragStart }: SortableCardProps) => {
    const store = useStore();
    const ref = useRef<HTMLButtonElement>(null);

    const isSettling = store.settlingBlockId === block.id;
    const isActiveInStore = store.activeBlockId === block.id;
    const showPlaceholder = isActiveInStore || isSettling;

    // Calculate displacement for this card based on drag state
    const displacement = useMemo(() => {
      if (!store.activeBlockId || !store.overBlockId) return 0;

      const activeIndex = sortedBlocks.findIndex(
        (b) => b.id === store.activeBlockId,
      );
      const overIndex = sortedBlocks.findIndex(
        (b) => b.id === store.overBlockId,
      );

      if (activeIndex === -1 || overIndex === -1) return 0;

      // If THIS card is the placeholder (being dragged), move it to target position
      if (store.activeBlockId === block.id) {
        // Calculate target index based on drop position
        let targetIndex: number;
        if (store.dropPosition === "above") {
          targetIndex = overIndex;
        } else {
          targetIndex = overIndex + 1;
        }
        // Adjust for the fact that removing the active card shifts indices
        if (activeIndex < targetIndex) {
          targetIndex -= 1;
        }
        const indexDiff = targetIndex - activeIndex;
        return indexDiff * CARD_HEIGHT;
      }

      // For sibling cards: determine if this card needs to shift
      // based on where the dragged card is moving to

      if (activeIndex < overIndex) {
        // Dragging DOWN the list (from lower index to higher)
        // Cards between active and target shift UP to fill the gap
        if (store.dropPosition === "above") {
          // Target is just before overIndex, so cards from activeIndex+1 to overIndex-1 shift up
          if (index > activeIndex && index < overIndex) {
            return -CARD_HEIGHT;
          }
        } else {
          // Target is just after overIndex, so cards from activeIndex+1 to overIndex shift up
          if (index > activeIndex && index <= overIndex) {
            return -CARD_HEIGHT;
          }
        }
      } else if (activeIndex > overIndex) {
        // Dragging UP the list (from higher index to lower)
        // Cards between target and active shift DOWN to make room
        if (store.dropPosition === "above") {
          // Target is at overIndex, so cards from overIndex to activeIndex-1 shift down
          if (index >= overIndex && index < activeIndex) {
            return CARD_HEIGHT;
          }
        } else {
          // Target is just after overIndex, so cards from overIndex+1 to activeIndex-1 shift down
          if (index > overIndex && index < activeIndex) {
            return CARD_HEIGHT;
          }
        }
      }

      return 0;
    }, [
      store.activeBlockId,
      store.overBlockId,
      store.dropPosition,
      block.id,
      index,
      sortedBlocks,
    ]);

    useEffect(() => {
      const element = ref.current;
      if (!element) return;

      // Empty image to hide native drag preview
      const emptyImg = new Image();
      emptyImg.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

      return combine(
        draggable({
          element,
          getInitialData: () => ({
            type: "card",
            blockId: block.id,
            index,
          }),
          onGenerateDragPreview({ location, source, nativeSetDragImage }) {
            // Hide native drag image - we use custom overlay
            nativeSetDragImage?.(emptyImg, 0, 0);

            // Capture grab offset for overlay positioning
            const rect = source.element.getBoundingClientRect();
            onDragStart(block, rect, {
              x: location.current.input.clientX - rect.left,
              y: location.current.input.clientY - rect.top,
            });
          },
          onDragStart() {
            store.startDrag(block.id);
          },
          onDrop() {
            // Cleanup handled by page-level monitor
          },
        }),
        dropTargetForElements({
          element,
          getData: ({ input, element: el }) => {
            return attachClosestEdge(
              { type: "card", blockId: block.id, index },
              { input, element: el, allowedEdges: ["top", "bottom"] },
            );
          },
          canDrop: ({ source }) => source.data.blockId !== block.id,
          onDragEnter: ({ self }) => {
            const edge = extractClosestEdge(self.data);
            store.setDropTarget(block.id, edge === "top" ? "above" : "below");
          },
          onDrag: ({ self }) => {
            const edge = extractClosestEdge(self.data);
            store.setDropTarget(block.id, edge === "top" ? "above" : "below");
          },
          onDragLeave: () => {
            // Don't clear here - let the next onDragEnter handle it
          },
          onDrop: () => {
            // Cleanup handled by page-level monitor
          },
        }),
      );
    }, [block, index, onDragStart, store]);

    return (
      <div
        className="mb-2"
        style={{
          transform: displacement !== 0 ? `translateY(${displacement}px)` : undefined,
          transition: "transform 200ms ease",
        }}
      >
        <button
          ref={ref}
          data-sortable-item
          data-settling-target={isSettling ? block.id : undefined}
          className={cn(
            "flex w-full text-left group rounded-xl border border-border bg-white p-4 transition-shadow cursor-grab",
            {
              "bg-muted/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] z-0":
                showPlaceholder,
              "z-10": !showPlaceholder,
            },
          )}
        >
          <div
            className={cn({
              "opacity-0": showPlaceholder,
            })}
          >
            <CardInner block={block} />
          </div>
        </button>
      </div>
    );
  },
);

SortableCard.displayName = "SortableCard";
