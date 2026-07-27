/**
 * Euler-integrated spring with a live target, modelled on Framer Motion's
 * `useSpring`: the target can change mid-flight and the spring chases it
 * instead of restarting. Framework-free, so the same simulation drives the
 * in-flight drag tilt and the post-release settle.
 */

/**
 * A type alias rather than an interface on purpose: only aliases get an
 * implicit index signature, which is what lets persisted settings be validated
 * generically against `Record<string, number>` in `lib/stores/persistence`.
 */
export type SpringConfig = {
  stiffness: number;
  damping: number;
  mass: number;
  /** Speed below which the spring counts as stopped, in units per second. */
  restSpeed: number;
  /** Distance from the target below which the spring counts as arrived. */
  restDistance: number;
};

export interface SpringSample {
  value: number;
  velocity: number;
  /** True once the spring is within both `restSpeed` and `restDistance`. */
  atRest: boolean;
}

export interface Spring {
  setTarget(target: number): void;
  /** Jump to a value without animating, and clear accumulated velocity. */
  setCurrent(value: number): void;
  setConfig(config: Partial<SpringConfig>): void;
  step(now: number): SpringSample;
}

const SPRING_DEFAULTS: SpringConfig = {
  stiffness: 100,
  damping: 10,
  mass: 1,
  restSpeed: 2,
  restDistance: 0.5,
};

/**
 * A long gap between frames (backgrounded tab, GC pause) would otherwise be
 * integrated as one huge step and fling the spring across the screen. Clamp
 * each step to roughly 15fps worth of time.
 */
const MAX_FRAME_MS = 64;

const MS_PER_SECOND = 1000;

/**
 * Overlay `source` onto `base`, taking only finite numbers. Everything feeding
 * a spring is untrusted, whether it is a caller's partial config or a persisted
 * payload, and a single NaN reaching the integrator poisons every later frame
 * with no error to trace it back to.
 */
export const pickFiniteNumbers = <T extends Record<string, number>>(
  base: T,
  source: unknown
): T => {
  const merged = { ...base };
  if (typeof source !== "object" || source === null) {
    return merged;
  }
  const values = source as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof T)[]) {
    const next = values[key as string];
    if (typeof next === "number" && Number.isFinite(next)) {
      merged[key] = next as T[keyof T];
    }
  }
  return merged;
};

export const createSpring = (config: Partial<SpringConfig> = {}): Spring => {
  let settings = pickFiniteNumbers(SPRING_DEFAULTS, config);

  let current = 0;
  let velocity = 0;
  let target = 0;
  let lastTime: number | null = null;

  return {
    setTarget(next) {
      target = next;
    },

    setCurrent(value) {
      current = value;
      velocity = 0;
      // Drop the timestamp so the next step measures from that frame rather
      // than integrating the whole gap since the spring last ran.
      lastTime = null;
    },

    setConfig(next) {
      settings = pickFiniteNumbers(settings, next);
    },

    step(now) {
      if (lastTime === null) {
        lastTime = now;
        return { value: current, velocity, atRest: false };
      }

      const deltaSeconds =
        Math.min(now - lastTime, MAX_FRAME_MS) / MS_PER_SECOND;
      lastTime = now;

      // F = -kx - cv, then a = F / m
      const displacement = current - target;
      const springForce = -settings.stiffness * displacement;
      const dampingForce = -settings.damping * velocity;
      const acceleration = (springForce + dampingForce) / settings.mass;

      velocity += acceleration * deltaSeconds;
      current += velocity * deltaSeconds;

      const atRest =
        Math.abs(velocity) < settings.restSpeed &&
        Math.abs(current - target) < settings.restDistance;

      if (atRest) {
        current = target;
        velocity = 0;
      }

      return { value: current, velocity, atRest };
    },
  };
};
