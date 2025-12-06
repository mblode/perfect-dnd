"use client";

import { useCallback, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { useStore } from "@/lib/stores/store";
import type { BlockData } from "@/types/block";
import { SortableCard } from "./sortable-card";
import { DragOverlayPortal } from "./drag-overlay-portal";
import { SettlingOverlay } from "./settling-overlay";

interface DragState {
  block: BlockData;
  initialPosition: { x: number; y: number };
  initialOffset: { x: number; y: number };
  sourceWidth: number;
}

export const PragmaticDndPage = observer(() => {
  const store = useStore();
  const pageId = store.pageId;
  const [dragState, setDragState] = useState<DragState | null>(null);

  const sortedBlocks = store.blocksData
    .filter((block) => block.pageId === pageId)
    .sort((a, b) => a.order - b.order);

  const handleDragStart = useCallback(
    (
      block: BlockData,
      rect: DOMRect,
      offset: { x: number; y: number },
    ) => {
      setDragState({
        block,
        initialPosition: { x: rect.left, y: rect.top },
        initialOffset: offset,
        sourceWidth: rect.width,
      });
    },
    [],
  );

  // Global monitor for drop handling and cleanup
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === "card",
      onDrop({ source, location }) {
        // Capture overlay position FIRST before any state changes (Bug 4 fix)
        const overlayCard = document.querySelector("[data-overlay-card]") as HTMLElement | null;
        let capturedRect: { top: number; left: number; width: number; height: number } | null = null;
        let capturedRotation = 0;

        if (overlayCard) {
          const rect = overlayCard.getBoundingClientRect();
          // Get rotation from CSS variable
          const rotateStyle = overlayCard.parentElement?.style.getPropertyValue("--motion-rotate") || "0deg";
          capturedRotation = parseFloat(rotateStyle) || 0;
          // Compensate for scale(1.04)
          const scale = 1.04;
          capturedRect = {
            top: rect.top,
            left: rect.left,
            width: rect.width / scale,
            height: rect.height / scale,
          };
        }

        const destination = location.current.dropTargets[0];

        if (!destination) {
          // Dropped outside - just cleanup
          store.clearDropTarget();
          store.endDrag();
          setDragState(null);
          return;
        }

        const sourceBlockId = source.data.blockId as string;
        const destBlockId = destination.data.blockId as string;

        if (sourceBlockId === destBlockId) {
          // Dropped on self - just cleanup
          store.clearDropTarget();
          store.endDrag();
          setDragState(null);
          return;
        }

        const sourceIndex = sortedBlocks.findIndex(
          (b) => b.id === sourceBlockId,
        );
        const destIndex = sortedBlocks.findIndex((b) => b.id === destBlockId);
        const closestEdge = extractClosestEdge(destination.data);

        if (sourceIndex === -1 || destIndex === -1) {
          store.clearDropTarget();
          store.endDrag();
          setDragState(null);
          return;
        }

        // Calculate final index
        let finalIndex = destIndex;
        if (closestEdge === "bottom") {
          finalIndex += 1;
        }
        // Account for removal of source item
        if (sourceIndex < finalIndex) {
          finalIndex -= 1;
        }

        if (finalIndex !== sourceIndex) {
          const newOrder = sortedBlocks.map((b) => b.id);
          const [removed] = newOrder.splice(sourceIndex, 1);
          newOrder.splice(finalIndex, 0, removed);
          store.reorderBlocks(pageId, newOrder);
        }

        // Clear drop target and start settling animation
        store.clearDropTarget();

        // Start settling with captured rect (Bug 4 fix - clean handoff)
        if (capturedRect) {
          store.startSettling(capturedRect, capturedRotation);
        } else {
          store.endDrag();
        }

        setDragState(null);
      },
    });
  }, [sortedBlocks, store, pageId]);

  const handleSettlingComplete = useCallback(() => {
    store.endDrag();
  }, [store]);

  const settlingBlock = store.settlingBlockId
    ? sortedBlocks.find((b) => b.id === store.settlingBlockId)
    : null;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex-1">
        <div className="mx-auto">
          <div className="flex gap-4 p-4">
            <div className="flex-1 min-w-0 overflow-auto">
              <div className="mx-auto max-w-lg py-2">
                {sortedBlocks.map((block, index) => (
                  <SortableCard
                    key={block.id}
                    block={block}
                    index={index}
                    sortedBlocks={sortedBlocks}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Custom drag overlay with physics rotation */}
      {dragState && <DragOverlayPortal {...dragState} />}

      {/* Settling overlay - renders outside dnd control */}
      {settlingBlock && (
        <SettlingOverlay
          block={settlingBlock}
          onAnimationComplete={handleSettlingComplete}
        />
      )}
    </div>
  );
});

PragmaticDndPage.displayName = "PragmaticDndPage";
