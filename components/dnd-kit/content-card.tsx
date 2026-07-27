"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { observer } from "mobx-react-lite";

import { settlingTargetMarker, sortableItemMarker } from "@/lib/dnd/dom";
import { useStore } from "@/lib/stores/store";
import { cn } from "@/lib/utils";
import type { BlockData } from "@/types/block";

import { CardInner } from "./card-inner";

interface ContentCardProps {
  block: BlockData;
}

export const ContentCard = observer(({ block }: ContentCardProps) => {
  const store = useStore();

  const isSettling = store.settlingBlockId === block.id;
  // dnd-kit's own `isDragging` clears the moment the pointer lifts, but the
  // slot has to stay empty until the settling card lands in it.
  const showPlaceholder = store.activeBlockId === block.id || isSettling;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: block.id });

  return (
    <div className="mb-2">
      <button
        {...attributes}
        {...listeners}
        {...sortableItemMarker()}
        {...settlingTargetMarker(isSettling ? block.id : null)}
        className={cn(
          "group flex w-full cursor-grab rounded-xl border border-border bg-white p-4 text-left transition-shadow",
          showPlaceholder
            ? "z-0 bg-muted/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
            : "z-10"
        )}
        ref={setNodeRef}
        style={{
          // Hold still while the settling overlay flies in: the sortable
          // transform would otherwise slide the slot out from under it.
          transform: isSettling ? undefined : CSS.Transform.toString(transform),
          transition: isSettling ? undefined : transition,
        }}
      >
        <div className={cn(showPlaceholder && "opacity-0")}>
          <CardInner block={block} />
        </div>
      </button>
    </div>
  );
});

ContentCard.displayName = "ContentCard";
