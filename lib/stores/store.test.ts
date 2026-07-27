import { beforeEach, describe, expect, it } from "vitest";

import type { SettleOrigin } from "@/lib/dnd/drag-phase";
import { Store } from "@/lib/stores/store";

const ORIGIN: SettleOrigin = {
  rect: { top: 10, left: 20, width: 300, height: 64 },
  rotation: -12,
  scale: 1.04,
};

describe("drag phase", () => {
  let store: Store;

  beforeEach(() => {
    store = new Store();
  });

  it("starts idle", () => {
    expect(store.dragPhase).toEqual({ status: "idle" });
    expect(store.activeBlockId).toBeNull();
    expect(store.settlingBlockId).toBeNull();
  });

  it("holds the card while it is dragged", () => {
    store.beginDrag("block-1");

    expect(store.dragPhase.status).toBe("dragging");
    expect(store.activeBlockId).toBe("block-1");
    // Only one card is ever in one phase; a card cannot be held and settling.
    expect(store.settlingBlockId).toBeNull();
  });

  it("carries the block and its origin into the settle", () => {
    store.beginDrag("block-1");
    store.beginSettling(ORIGIN);

    expect(store.dragPhase).toEqual({
      status: "settling",
      blockId: "block-1",
      origin: ORIGIN,
    });
    expect(store.settlingBlockId).toBe("block-1");
    expect(store.activeBlockId).toBeNull();
  });

  it("ignores a settle that arrives after the drag was already cancelled", () => {
    // The race this state machine exists to remove. dnd-kit dispatches release
    // to the context handler and to monitors in one batch, and both used to
    // write drag state. If the settle could still land after endDrag, a card
    // would fly in from a stale rect after the user had already let go.
    store.beginDrag("block-1");
    store.endDrag();
    store.beginSettling(ORIGIN);

    expect(store.dragPhase).toEqual({ status: "idle" });
    expect(store.settlingBlockId).toBeNull();
  });

  it("ignores a settle with no drag in flight", () => {
    store.beginSettling(ORIGIN);
    expect(store.dragPhase).toEqual({ status: "idle" });
  });

  it("ignores a second settle for an in-flight one", () => {
    // Keeps the first origin, so a duplicate release cannot restart the
    // animation from a rect measured after the card already began moving.
    store.beginDrag("block-1");
    store.beginSettling(ORIGIN);
    store.beginSettling({ ...ORIGIN, rotation: 40 });

    expect(store.dragPhase).toEqual({
      status: "settling",
      blockId: "block-1",
      origin: ORIGIN,
    });
  });

  it.each(["dragging", "settling"] as const)(
    "returns to idle from %s",
    (from) => {
      store.beginDrag("block-1");
      if (from === "settling") {
        store.beginSettling(ORIGIN);
      }

      store.endDrag();

      expect(store.dragPhase).toEqual({ status: "idle" });
      expect(store.activeBlockId).toBeNull();
      expect(store.settlingBlockId).toBeNull();
    }
  );
});
