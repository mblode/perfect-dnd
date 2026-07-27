"use client";

import { autorun, makeAutoObservable, runInAction, toJS } from "mobx";
import { createContext, useContext, useEffect, useLayoutEffect } from "react";

import type { DragPhase, SettleOrigin } from "@/lib/dnd/drag-phase";
import {
  draggingBlockId,
  IDLE_PHASE,
  settlingBlockId,
} from "@/lib/dnd/drag-phase";
import { DEFAULT_PAGE_ID, MOCK_BLOCKS } from "@/lib/stores/mock-blocks";
import {
  PERSIST_DEBOUNCE_MS,
  readPersistedState,
  writePersistedState,
} from "@/lib/stores/persistence";
import type { BlockData } from "@/types/block";

export class Store {
  blocksData: BlockData[] = MOCK_BLOCKS;

  /** The whole drag lifecycle. See `lib/dnd/drag-phase`. */
  dragPhase: DragPhase = IDLE_PHASE;

  pageId = DEFAULT_PAGE_ID;

  constructor() {
    makeAutoObservable(this, undefined, { autoBind: true });
  }

  get activeBlockId(): string | null {
    return draggingBlockId(this.dragPhase);
  }

  get settlingBlockId(): string | null {
    return settlingBlockId(this.dragPhase);
  }

  /**
   * Applies persisted state, then keeps writing changes back. Client-only, and
   * called after mount so the first client render still matches the server
   * HTML. Returns a disposer.
   */
  startPersisting() {
    const persisted = readPersistedState();

    runInAction(() => {
      if (persisted.blocksData) {
        this.blocksData = persisted.blocksData;
      }
    });

    // toJS reads every nested value, so the autorun tracks each block's fields
    // and not just the identity of the array.
    return autorun(
      () => {
        writePersistedState({ blocksData: toJS(this.blocksData) });
      },
      { delay: PERSIST_DEBOUNCE_MS }
    );
  }

  reorderBlocks(pageId: string, newOrder: string[]) {
    this.blocksData = this.blocksData.map((block) => {
      if (block.pageId !== pageId) {
        return block;
      }
      const newIndex = newOrder.indexOf(block.id);
      if (newIndex === -1) {
        return block;
      }
      return { ...block, order: newIndex };
    });
  }

  beginDrag(blockId: string) {
    this.dragPhase = { status: "dragging", blockId };
  }

  /**
   * Hand the card to the settling overlay. Ignored unless a drag is in flight,
   * which makes it safe whatever order dnd-kit delivers release and cancel in.
   */
  beginSettling(origin: SettleOrigin) {
    if (this.dragPhase.status !== "dragging") {
      return;
    }
    this.dragPhase = {
      status: "settling",
      blockId: this.dragPhase.blockId,
      origin,
    };
  }

  /** Return to rest from any phase: settle finished, cancelled, or aborted. */
  endDrag() {
    this.dragPhase = IDLE_PHASE;
  }
}

const store = new Store();

const StoreContext = createContext<Store>(store);

export function useStore(): Store {
  return useContext(StoreContext);
}

// Runs after hydration but before paint, so the persisted order is applied
// without a visible flash of the default order. There is no server equivalent.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function StoreProvider({ children }: React.PropsWithChildren) {
  useIsomorphicLayoutEffect(() => store.startPersisting(), []);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}
