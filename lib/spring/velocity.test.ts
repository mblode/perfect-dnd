import { describe, expect, it } from "vitest";

import { createVelocityTracker, velocityToRotation } from "./velocity";

const WINDOW_MS = 100;

describe("velocityToRotation", () => {
  it("tilts against the direction of travel", () => {
    // Dragging right must tilt the card left, the way a hanging object lags
    // behind the hand carrying it. A dropped minus sign inverts the whole feel.
    expect(velocityToRotation(1000, 0.005, 45)).toBeCloseTo(-5);
    expect(velocityToRotation(-1000, 0.005, 45)).toBeCloseTo(5);
  });

  it("clamps to maxRotation in both directions", () => {
    // Without the clamp a fast flick spins the card past a right angle.
    expect(velocityToRotation(100_000, 0.005, 45)).toBeCloseTo(-45);
    expect(velocityToRotation(-100_000, 0.005, 45)).toBeCloseTo(45);
  });

  it("is flat at zero velocity", () => {
    expect(velocityToRotation(0, 0.005, 45)).toBeCloseTo(0);
  });
});

describe("createVelocityTracker", () => {
  it("reports zero until two samples span real time", () => {
    const tracker = createVelocityTracker();
    expect(tracker.sample({ x: 0, y: 0 }, 0, WINDOW_MS)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("measures pixels per second across the window", () => {
    const tracker = createVelocityTracker();
    tracker.sample({ x: 0, y: 0 }, 0, WINDOW_MS);
    // 50px in 50ms is 1000px/s.
    expect(tracker.sample({ x: 50, y: 25 }, 50, WINDOW_MS)).toEqual({
      x: 1000,
      y: 500,
    });
  });

  it("decays to zero once older samples age out of the window", () => {
    // Pointer events stop firing when the pointer holds still. If stale samples
    // were kept, the card would stay tilted while the finger was stationary.
    const tracker = createVelocityTracker();
    tracker.sample({ x: 0, y: 0 }, 0, WINDOW_MS);
    tracker.sample({ x: 50, y: 0 }, 50, WINDOW_MS);
    expect(tracker.sample({ x: 50, y: 0 }, 400, WINDOW_MS)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it.each([
    ["negative infinity", Number.NEGATIVE_INFINITY],
    ["positive infinity", Number.POSITIVE_INFINITY],
    ["NaN", Number.NaN],
  ])("suppresses a %s reading rather than passing it on", (_label, value) => {
    // Regression: the guard used to test only `=== POSITIVE_INFINITY`, so a
    // negative or NaN reading reached the spring, where it pinned the tilt
    // target at an invalid value for the rest of the drag with no error.
    const tracker = createVelocityTracker();
    tracker.sample({ x: 0, y: 0 }, 0, WINDOW_MS);
    expect(tracker.sample({ x: value, y: 0 }, 50, WINDOW_MS)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("returns a value callers cannot mutate into later readings", () => {
    // The zero reading is handed out by reference on every still frame.
    const tracker = createVelocityTracker();
    const resting = tracker.sample({ x: 0, y: 0 }, 0, WINDOW_MS);
    expect(() => {
      resting.x = 999;
    }).toThrow();
  });

  it("forgets history on reset", () => {
    const tracker = createVelocityTracker();
    tracker.sample({ x: 0, y: 0 }, 0, WINDOW_MS);
    tracker.reset();
    // Without the reset this second sample would measure against the first and
    // report motion that belongs to the previous drag.
    expect(tracker.sample({ x: 50, y: 0 }, 50, WINDOW_MS)).toEqual({
      x: 0,
      y: 0,
    });
  });
});
