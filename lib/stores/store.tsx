"use client";

import { autorun, makeAutoObservable, runInAction, toJS } from "mobx";
import { createContext, useContext, useEffect, useLayoutEffect } from "react";

import { type DragSwingSettings, getDragSwingDefaults } from "@/lib/spring";
import type { BlockData, DropPosition } from "@/types/block";

// Mock data for demo
const MOCK_BLOCKS: BlockData[] = [
  {
    id: "block-1",
    title: "My Portfolio",
    type: "link",
    url: "https://portfolio.com",
    visible: true,
    order: 0,
    pageId: "page-1",
  },
  {
    id: "block-2",
    title: "About Me",
    type: "header",
    visible: true,
    order: 1,
    pageId: "page-1",
  },
  {
    id: "block-3",
    title: "Twitter",
    type: "link",
    url: "https://twitter.com",
    visible: true,
    order: 2,
    pageId: "page-1",
  },
  {
    id: "block-4",
    title: "Instagram",
    type: "link",
    url: "https://instagram.com",
    visible: false,
    order: 3,
    pageId: "page-1",
  },
  {
    id: "block-5",
    title: "Contact",
    type: "text",
    visible: true,
    order: 4,
    pageId: "page-1",
  },
];

const STORAGE_KEY = "perfect-dnd-store";

/** Debounced so dragging a settings slider doesn't write on every frame. */
const PERSIST_DEBOUNCE_MS = 200;

type PersistedState = {
  blocksData: BlockData[];
  dragSwingSettings: DragSwingSettings;
};

const BLOCK_TYPES = new Set<BlockData["type"]>(["link", "header", "text"]);

const isBlockData = (value: unknown): value is BlockData => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const block = value as Record<string, unknown>;
  return (
    typeof block.id === "string" &&
    typeof block.title === "string" &&
    typeof block.pageId === "string" &&
    typeof block.order === "number" &&
    typeof block.visible === "boolean" &&
    BLOCK_TYPES.has(block.type as BlockData["type"])
  );
};

/** Copies only finite numbers off the persisted payload, so a hand-edited or
 * stale entry can't feed NaN into the spring simulation. */
const mergeNumbers = <T extends Record<string, number>>(
  base: T,
  override: unknown
): T => {
  if (typeof override !== "object" || override === null) {
    return base;
  }
  const source = override as Record<string, unknown>;
  const merged = { ...base };
  for (const key of Object.keys(base)) {
    const next = source[key];
    if (typeof next === "number" && Number.isFinite(next)) {
      merged[key as keyof T] = next as T[keyof T];
    }
  }
  return merged;
};

const mergeDragSwingSettings = (value: unknown): DragSwingSettings => {
  const { rotationSpring, scaleSpring, ...scalars } = getDragSwingDefaults();
  const source = (value ?? {}) as Record<string, unknown>;

  return {
    ...mergeNumbers(scalars, source),
    rotationSpring: mergeNumbers(rotationSpring, source.rotationSpring),
    scaleSpring: mergeNumbers(scaleSpring, source.scaleSpring),
  };
};

/**
 * localStorage is synchronous, so reading it needs no async plumbing. Anything
 * blocked, corrupt, or malformed resolves to defaults instead of leaving the
 * app without usable state.
 */
const readPersistedState = (): Partial<PersistedState> => {
  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return {}; // Storage disabled (private mode, blocked cookies).
  }

  if (!raw) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {}; // Corrupt payload.
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }

  const { blocksData, dragSwingSettings } = parsed as Record<string, unknown>;

  return {
    blocksData:
      Array.isArray(blocksData) && blocksData.every(isBlockData)
        ? blocksData
        : undefined,
    dragSwingSettings:
      dragSwingSettings === undefined
        ? undefined
        : mergeDragSwingSettings(dragSwingSettings),
  };
};

const writePersistedState = (state: PersistedState) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage blocked. Persistence is best-effort and must
    // never take the app down with it.
  }
};

export class Store {
  blocksData: BlockData[] = MOCK_BLOCKS;

  dragSwingSettings: DragSwingSettings = getDragSwingDefaults();

  // Drag state
  activeBlockId: string | null = null;
  settlingBlockId: string | null = null;
  overBlockId: string | null = null;
  dropPosition: DropPosition = null;

  // Drop animation state - position captured when drag ends
  dropAnimationRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null = null;
  dropAnimationRotation = 0;
  dropAnimationScale = 1;

  // Editor state
  pageId = "page-1";

  constructor() {
    makeAutoObservable(this, undefined, { autoBind: true });
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
      if (persisted.dragSwingSettings) {
        this.dragSwingSettings = persisted.dragSwingSettings;
      }
    });

    // toJS reads every nested value, so the autorun tracks nested spring
    // settings as well as the top-level fields.
    return autorun(
      () => {
        writePersistedState({
          blocksData: toJS(this.blocksData),
          dragSwingSettings: toJS(this.dragSwingSettings),
        });
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

  toggleVisibility(blockId: string) {
    this.blocksData = this.blocksData.map((block) =>
      block.id === blockId ? { ...block, visible: !block.visible } : block
    );
  }

  setDragSwingSetting<K extends keyof DragSwingSettings>(
    key: K,
    value: DragSwingSettings[K]
  ) {
    this.dragSwingSettings[key] = value;
  }

  setRotationSpringSetting<K extends keyof DragSwingSettings["rotationSpring"]>(
    key: K,
    value: DragSwingSettings["rotationSpring"][K]
  ) {
    this.dragSwingSettings.rotationSpring[key] = value;
  }

  setScaleSpringSetting<K extends keyof DragSwingSettings["scaleSpring"]>(
    key: K,
    value: DragSwingSettings["scaleSpring"][K]
  ) {
    this.dragSwingSettings.scaleSpring[key] = value;
  }

  resetDragSwingSettings() {
    this.dragSwingSettings = getDragSwingDefaults();
  }

  setDropTarget(overBlockId: string | null, position: DropPosition) {
    this.overBlockId = overBlockId;
    this.dropPosition = position;
  }

  clearDropTarget() {
    this.overBlockId = null;
    this.dropPosition = null;
  }

  startDrag(blockId: string) {
    this.activeBlockId = blockId;
    this.dropAnimationRect = null;
    this.dropAnimationRotation = 0;
    this.dropAnimationScale = 1;
  }

  // Called when drag ends - start the settling phase
  startSettling(
    rect: { top: number; left: number; width: number; height: number },
    rotation: number,
    scale: number
  ) {
    this.settlingBlockId = this.activeBlockId;
    this.dropAnimationRect = rect;
    this.dropAnimationRotation = rotation;
    this.dropAnimationScale = scale;
    this.activeBlockId = null;
    this.clearDropTarget();
  }

  // Called when drop animation completes
  endDrag() {
    this.activeBlockId = null;
    this.settlingBlockId = null;
    this.dropAnimationRect = null;
    this.dropAnimationRotation = 0;
    this.dropAnimationScale = 1;
  }
}

// Singleton instance
const store = new Store();

// Context
export const StoreContext = createContext<Store>(store);

// Hook
export function useStore(): Store {
  return useContext(StoreContext);
}

// Runs after hydration but before paint, so the persisted order is applied
// without a visible flash of the default order. There is no server equivalent.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// Provider
export function StoreProvider({ children }: React.PropsWithChildren) {
  useIsomorphicLayoutEffect(() => store.startPersisting(), []);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}
