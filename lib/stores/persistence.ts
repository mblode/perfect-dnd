/**
 * localStorage persistence for the store.
 *
 * Everything read back is untrusted: it may have been written by an older
 * build, hand-edited, or truncated. Every failure resolves to defaults rather
 * than propagating, because losing a saved card order is recoverable and a
 * blank app is not.
 */

import type { DragSwingSettings } from "@/lib/spring/settings";
import { getDragSwingDefaults } from "@/lib/spring/settings";
import type { BlockData } from "@/types/block";

const STORAGE_KEY = "perfect-dnd-store";

/** Debounced so dragging a settings slider does not write on every frame. */
export const PERSIST_DEBOUNCE_MS = 200;

export interface PersistedState {
  blocksData: BlockData[];
  dragSwingSettings: DragSwingSettings;
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

/** Constrains T to an object whose every property is a number. */
type AllNumbers<T> = { [K in keyof T]: number };

/**
 * Copies only finite numbers off the persisted payload, so a stale or
 * hand-edited entry cannot feed NaN into the spring simulation, where it would
 * poison every later frame.
 */
const mergeNumbers = <T extends AllNumbers<T>>(
  base: T,
  override: unknown
): T => {
  if (typeof override !== "object" || override === null) {
    return base;
  }
  const source = override as Record<string, unknown>;
  const merged = { ...base };
  for (const key of Object.keys(base) as (keyof T)[]) {
    const next = source[key as string];
    if (typeof next === "number" && Number.isFinite(next)) {
      merged[key] = next as T[keyof T];
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

export const writePersistedState = (state: PersistedState): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage blocked. Persistence is best-effort and must
    // never take the app down with it.
  }
};
