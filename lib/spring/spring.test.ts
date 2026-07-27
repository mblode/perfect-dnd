import { describe, expect, it } from "vitest";

import { createSpring, pickFiniteNumbers } from "./spring";

const UNDERDAMPED = {
  stiffness: 100,
  damping: 10,
  mass: 1,
  restSpeed: 2,
  restDistance: 0.5,
};

/** Critically damped for k=100, m=1, so it settles without oscillating. */
const CRITICAL = { ...UNDERDAMPED, damping: 20 };

describe("createSpring", () => {
  it("primes its clock on the first step instead of integrating", () => {
    // The first step has no previous timestamp to measure against. Integrating
    // from zero would treat the whole page lifetime as one frame.
    const spring = createSpring(CRITICAL);
    spring.setTarget(100);
    expect(spring.step(1000)).toEqual({
      value: 0,
      velocity: 0,
      atRest: false,
    });
  });

  it("clamps a long frame gap so a backgrounded tab cannot fling it", () => {
    // requestAnimationFrame is frozen while a tab is hidden. Without the clamp
    // the first frame back integrates the whole absence in one step and throws
    // the card off-screen.
    const stalled = createSpring(CRITICAL);
    stalled.setTarget(100);
    stalled.step(0);
    const afterStall = stalled.step(10_000);

    const steady = createSpring(CRITICAL);
    steady.setTarget(100);
    steady.step(0);
    const afterFrame = steady.step(64);

    expect(afterStall.value).toBeCloseTo(afterFrame.value);
    expect(afterStall.value).toBeLessThan(100);
  });

  it("snaps exactly onto the target once it comes to rest", () => {
    // Callers stop the loop on atRest, so a spring that reports rest while
    // still short of its target leaves the card permanently offset.
    const spring = createSpring(CRITICAL);
    spring.setCurrent(0);
    spring.setTarget(10);

    let sample = spring.step(0);
    for (let now = 16; now <= 5000 && !sample.atRest; now += 16) {
      sample = spring.step(now);
    }

    expect(sample.atRest).toBe(true);
    expect(sample.value).toBe(10);
    expect(sample.velocity).toBe(0);
  });

  it("drops accumulated velocity when jumped to a new value", () => {
    const spring = createSpring(UNDERDAMPED);
    spring.setTarget(100);
    spring.step(0);
    spring.step(64);

    spring.setCurrent(5);
    // Priming again means the jump is not integrated as motion.
    expect(spring.step(128)).toEqual({ value: 5, velocity: 0, atRest: false });
  });

  it("ignores a non-finite config value instead of poisoning the integrator", () => {
    // Settings arrive from persisted JSON. One NaN reaching the integrator
    // makes every later frame NaN, with no error pointing back to the source.
    const poisoned = createSpring(CRITICAL);
    poisoned.setConfig({ stiffness: Number.NaN, damping: Number.NaN });
    poisoned.setTarget(100);
    poisoned.step(0);
    const afterPoison = poisoned.step(64);

    const clean = createSpring(CRITICAL);
    clean.setTarget(100);
    clean.step(0);
    const afterClean = clean.step(64);

    expect(Number.isFinite(afterPoison.value)).toBe(true);
    expect(afterPoison.value).toBeCloseTo(afterClean.value);
  });
});

describe("pickFiniteNumbers", () => {
  it("takes finite overrides and keeps the base for everything else", () => {
    expect(pickFiniteNumbers({ a: 1, b: 2 }, { a: 5 })).toEqual({ a: 5, b: 2 });
  });

  it.each([
    ["NaN", Number.NaN],
    ["infinity", Number.POSITIVE_INFINITY],
    ["a string", "5"],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_label, value) => {
    expect(pickFiniteNumbers({ a: 1 }, { a: value })).toEqual({ a: 1 });
  });

  it("ignores keys the base does not declare", () => {
    // Stops an old or hand-edited payload widening the config shape.
    expect(pickFiniteNumbers({ a: 1 }, { rogue: 9 })).toEqual({ a: 1 });
  });

  it.each([
    ["null", null],
    ["a primitive", 7],
    ["undefined", undefined],
  ])("falls back to the base when the source is %s", (_label, source) => {
    expect(pickFiniteNumbers({ a: 1 }, source)).toEqual({ a: 1 });
  });

  it("returns a copy so the base cannot be mutated through it", () => {
    const base = { a: 1 };
    const merged = pickFiniteNumbers(base, { a: 5 });
    expect(merged).not.toBe(base);
    expect(base.a).toBe(1);
  });
});
