/**
 * localStorage persistence for the store.
 *
 * Everything read back is untrusted: it may have been written by an older
 * build, hand-edited, or truncated. Every failure resolves to defaults rather
 * than propagating, because losing a saved card order is recoverable and a
 * blank app is not.
 */

import type { BlockData } from "@/types/block";

const STORAGE_KEY = "perfect-dnd-store";

/** Debounced so dragging a settings slider does not write on every frame. */
export const PERSIST_DEBOUNCE_MS = 200;

export interface PersistedState {
  blocksData: BlockData[];
}

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

/** localStorage is synchronous, so reading it needs no async plumbing. */
export const readPersistedState = (): Partial<PersistedState> => {
  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return {}; // Storage disabled: private mode, blocked cookies.
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

  // Keys this build no longer writes (an older one persisted drag physics here)
  // are simply not read, so an existing payload still loads its block order.
  const { blocksData } = parsed as Record<string, unknown>;

  return {
    // The length check is not redundant: `[].every()` is vacuously true, and an
    // empty list would replace the demo blocks with a permanently empty page,
    // since nothing in this app can add one back.
    blocksData:
      Array.isArray(blocksData) &&
      blocksData.length > 0 &&
      blocksData.every(isBlockData)
        ? blocksData
        : undefined,
  };
};

export const writePersistedState = (state: PersistedState): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage blocked. Persistence is best-effort and must
    // never take the app down with it.
  }
};
