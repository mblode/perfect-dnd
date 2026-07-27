/**
 * The drag lifecycle as one value.
 *
 * A card is idle, held, or settling back into the list, never a combination.
 * Modelling it as separate `activeBlockId` / `settlingBlockId` / rect / rotation
 * / scale fields let illegal pairs exist, and the transitions were shared
 * between two components that raced on drag cancel.
 */

export interface SettleOrigin {
  /** Where the card was, in viewport coordinates, at the moment of release. */
  rect: { top: number; left: number; width: number; height: number };
  /** Tilt in degrees at release, so the settle spring starts from it. */
  rotation: number;
  /** Scale at release, so the settle spring starts from it. */
  scale: number;
}

export type DragPhase =
  | { readonly status: "idle" }
  | { readonly status: "dragging"; readonly blockId: string }
  | {
      readonly status: "settling";
      readonly blockId: string;
      readonly origin: SettleOrigin;
    };

export const IDLE_PHASE: DragPhase = { status: "idle" };

export const draggingBlockId = (phase: DragPhase): string | null =>
  phase.status === "dragging" ? phase.blockId : null;

export const settlingBlockId = (phase: DragPhase): string | null =>
  phase.status === "settling" ? phase.blockId : null;
