"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";

import { GitHubLink } from "@/components/github-link";
import type { SettleOrigin } from "@/lib/dnd/drag-phase";
import {
  TrackedMouseSensor,
  TrackedTouchSensor,
} from "@/lib/dnd/tracked-sensors";
import { useStore } from "@/lib/stores/store";

import { ContentCard } from "./content-card";
import { DragSwingOverlay } from "./drag-swing-overlay";
import { SettlingOverlay } from "./settling-overlay";

/** Pointer travel before a mouse drag starts, so a click stays a click. */
const MOUSE_ACTIVATION_DISTANCE_PX = 10;

/** Hold before a touch drag starts. Below this, the gesture is a page scroll. */
const TOUCH_ACTIVATION_DELAY_MS = 250;

/** How far a finger may drift during that hold before it counts as a scroll. */
const TOUCH_ACTIVATION_TOLERANCE_PX = 5;

/**
 * Owns the drag lifecycle. The overlays report what the pointer did; every
 * transition between idle, dragging, and settling is made here, so the phases
 * cannot race each other.
 */
export const EditorPage = observer(() => {
  const store = useStore();
  const pageId = store.pageId;

  const sortedBlocks = store.blocksData
    .filter((block) => block.pageId === pageId)
    .sort((a, b) => a.order - b.order);
  const sortedIds = sortedBlocks.map((block) => block.id);
  const blockById = new Map(sortedBlocks.map((block) => [block.id, block]));

  // MouseSensor + TouchSensor rather than PointerSensor, per dnd-kit guidance:
  // the two input types need different activation rules.
  const sensors = useSensors(
    useSensor(TrackedMouseSensor, {
      activationConstraint: { distance: MOUSE_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(TrackedTouchSensor, {
      activationConstraint: {
        delay: TOUCH_ACTIVATION_DELAY_MS,
        tolerance: TOUCH_ACTIVATION_TOLERANCE_PX,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    store.beginDrag(String(event.active.id));
  };

  // Reordering only. The card keeps flying after the pointer lifts, so the
  // phase is advanced by the overlay's release, not here.
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const from = sortedIds.indexOf(String(active.id));
    const to = sortedIds.indexOf(String(over.id));
    if (from === -1 || to === -1) {
      return;
    }

    store.reorderBlocks(pageId, arrayMove(sortedIds, from, to));
  };

  /**
   * The pointer came up. An origin means the card is somewhere visible and
   * should fly home; null means there is nothing to animate, so go straight
   * to rest rather than leaving the card stranded.
   *
   * Not memoised: both overlays read their callbacks through refs, so a fresh
   * identity each render cannot restart an animation.
   */
  const handleRelease = (origin: SettleOrigin | null) => {
    if (origin) {
      store.beginSettling(origin);
    } else {
      store.endDrag();
    }
  };

  const handleSettled = () => store.endDrag();

  /**
   * Covers a cancel that lands before the overlay has mounted to report one.
   * Safe to overlap with the overlay's own cancel: both resolve to idle, so
   * the order dnd-kit delivers them in cannot change the outcome.
   */
  const handleDragCancel = () => store.endDrag();

  const phase = store.dragPhase;
  const activeBlock = store.activeBlockId
    ? blockById.get(store.activeBlockId)
    : undefined;
  const settlingBlock =
    phase.status === "settling" ? blockById.get(phase.blockId) : undefined;

  /**
   * Both overlays report completion, so if the block they describe disappears
   * the overlay never mounts and the phase would stay non-idle forever, leaving
   * the list card stuck as an empty placeholder. Nothing removes a block today;
   * this keeps the "never strand a card" invariant true if anything ever does.
   */
  const phaseBlockMissing =
    phase.status !== "idle" && !blockById.has(phase.blockId);

  useEffect(() => {
    if (phaseBlockMissing) {
      store.endDrag();
    }
  }, [phaseBlockMissing, store]);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight">
              Perfect DnD
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Pick up a block and drop it somewhere else. Drag and drop made
              simple, built on dnd-kit.
            </p>
          </div>
          <GitHubLink />
        </header>

        <SortableContext
          items={sortedIds}
          strategy={verticalListSortingStrategy}
        >
          {sortedBlocks.map((block) => (
            <ContentCard block={block} key={block.id} />
          ))}
        </SortableContext>
      </main>

      {/* dropAnimation is null: the settling overlay below replaces it. */}
      <DragOverlay dropAnimation={null}>
        {activeBlock && (
          <DragSwingOverlay block={activeBlock} onRelease={handleRelease} />
        )}
      </DragOverlay>

      {phase.status === "settling" && settlingBlock && (
        <SettlingOverlay
          block={settlingBlock}
          onComplete={handleSettled}
          origin={phase.origin}
        />
      )}
    </DndContext>
  );
});

EditorPage.displayName = "EditorPage";
