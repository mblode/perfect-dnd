/**
 * Pointer velocity over a sliding time window, and the tilt it produces.
 *
 * Same approach as Framer Motion's `PanSession`: measure the newest sample
 * against the oldest one still inside the window, rather than frame to frame,
 * so a single stuttered frame does not spike the tilt.
 */

export interface Point {
  x: number;
  y: number;
}

interface TimestampedPoint extends Point {
  timestamp: number;
}

/** Velocity window in milliseconds. */
export const VELOCITY_WINDOW_MS = 100;

/** Multiplier converting pointer velocity in px/second to degrees of tilt. */
export const VELOCITY_SCALE = 0.005;

/** Ceiling on tilt in degrees, applied after scaling. */
export const MAX_ROTATION = 45;

const MS_PER_SECOND = 1000;

const AT_REST: Point = { x: 0, y: 0 };

export interface VelocityTracker {
  /**
   * Record a pointer position and return the velocity in px/second across the
   * window. Returns zero until there are two samples spanning real time.
   */
  sample(point: Point, now: number, windowMs: number): Point;
  reset(): void;
}

export const createVelocityTracker = (): VelocityTracker => {
  const history: TimestampedPoint[] = [];

  return {
    sample(point, now, windowMs) {
      history.push({ x: point.x, y: point.y, timestamp: now });

      while (history.length > 0 && now - history[0].timestamp >= windowMs) {
        history.shift();
      }

      const oldest = history[0];
      const latest = history.at(-1);

      if (!(oldest && latest) || oldest === latest) {
        return AT_REST;
      }

      const seconds = (latest.timestamp - oldest.timestamp) / MS_PER_SECOND;
      if (seconds <= 0) {
        return AT_REST;
      }

      const velocity = {
        x: (latest.x - oldest.x) / seconds,
        y: (latest.y - oldest.y) / seconds,
      };

      // A hand-edited clock or a duplicated timestamp can still produce a
      // non-finite result; NaN here would propagate into the spring forever.
      return Number.isFinite(velocity.x) && Number.isFinite(velocity.y)
        ? velocity
        : AT_REST;
    },

    reset() {
      history.length = 0;
    },
  };
};

/**
 * Convert horizontal velocity to a tilt in degrees.
 *
 * Inverted on purpose: dragging right tilts the card left, the way a hanging
 * object lags behind the hand carrying it.
 */
export const velocityToRotation = (
  velocityX: number,
  velocityScale: number,
  maxRotation: number
): number => {
  const rotation = -velocityX * velocityScale;
  return Math.sign(rotation) * Math.min(Math.abs(rotation), maxRotation);
};
