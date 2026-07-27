/**
 * Drives springs on `requestAnimationFrame`.
 *
 * Both animation phases need the same frame loop but stop differently. The
 * in-flight drag runs open-ended, because the springs reach rest whenever the
 * pointer holds still and the drag is not over. The post-release settle stops
 * as soon as the springs rest, under a hard deadline.
 */

/**
 * Hard stop for a settle. A spring tuned with too little damping can oscillate
 * below its rest threshold indefinitely; without this the loop would hold a
 * rAF callback, and the overlay it animates, open forever.
 */
const MAX_SETTLE_FRAMES = 120;
const MAX_SETTLE_DURATION_MS = 2000;

/** Why the loop stopped. Cancelling does not report; see `SpringLoop.cancel`. */
export type SpringLoopEnd = "rest" | "timeout";

export interface SpringLoop {
  /** Stop immediately without running `onEnd`; for teardown, not completion. */
  cancel(): void;
}

export interface SpringLoopOptions {
  /** Advance every spring by one frame. Return true when all are at rest. */
  onFrame(now: number): boolean;
  /**
   * True to stop once `onFrame` reports rest, bounded by the settle deadline.
   * False to run until `cancel()`, ignoring rest entirely.
   */
  untilRest: boolean;
  /** Runs at most once, only for an `untilRest` loop that was not cancelled. */
  onEnd?(reason: SpringLoopEnd): void;
}

export const runSpringLoop = ({
  onFrame,
  untilRest,
  onEnd,
}: SpringLoopOptions): SpringLoop => {
  const startedAt = performance.now();
  let frameId: number | null = null;
  let frameCount = 0;

  const stop = () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  const frame = (now: number) => {
    frameId = null;
    frameCount += 1;

    if (
      untilRest &&
      (frameCount > MAX_SETTLE_FRAMES ||
        now - startedAt > MAX_SETTLE_DURATION_MS)
    ) {
      onEnd?.("timeout");
      return;
    }

    const atRest = onFrame(now);

    if (untilRest && atRest) {
      onEnd?.("rest");
      return;
    }

    frameId = requestAnimationFrame(frame);
  };

  frameId = requestAnimationFrame(frame);

  return { cancel: stop };
};
