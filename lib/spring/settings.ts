/**
 * User-tunable drag physics. Every field is a finite number, which is what
 * lets persisted values be validated generically (see `lib/stores/persistence`)
 * and handed straight to `createSpring` without field-by-field copying.
 */

import type { SpringConfig } from "@/lib/spring/spring";
import {
  MAX_ROTATION,
  VELOCITY_SCALE,
  VELOCITY_WINDOW_MS,
} from "@/lib/spring/velocity";

/** The tilt spring is deliberately underdamped, so the card overshoots. */
export type RotationSpringSettings = SpringConfig;

/** Scale needs no inertia, so it is the spring config without `mass`. */
export type ScaleSpringSettings = Omit<SpringConfig, "mass">;

export interface DragSwingSettings {
  velocityWindowMs: number;
  velocityScale: number;
  maxRotation: number;
  /** Size of the card while held, as a multiple of its resting size. */
  dragScale: number;
  rotationSpring: RotationSpringSettings;
  scaleSpring: ScaleSpringSettings;
}

/** Card size at rest; the scale spring always returns here. */
export const REST_SCALE = 1;

/** Travel back to the drop slot: zeta of about 0.7, so ~5% overshoot. */
export const POSITION_SPRING_CONFIG: Omit<SpringConfig, "mass"> = {
  stiffness: 200,
  damping: 20,
  restSpeed: 1,
  restDistance: 0.5,
};

const DRAG_SWING_DEFAULTS: DragSwingSettings = {
  velocityWindowMs: VELOCITY_WINDOW_MS,
  velocityScale: VELOCITY_SCALE,
  maxRotation: MAX_ROTATION,
  dragScale: 1.04,
  rotationSpring: {
    stiffness: 100,
    damping: 10,
    mass: 1,
    restSpeed: 2,
    restDistance: 0.5,
  },
  scaleSpring: {
    stiffness: 550,
    damping: 30,
    restSpeed: 10,
    restDistance: 0.001,
  },
};

/** Fresh copy each call: the store mutates these in place as sliders move. */
export const getDragSwingDefaults = (): DragSwingSettings => ({
  ...DRAG_SWING_DEFAULTS,
  rotationSpring: { ...DRAG_SWING_DEFAULTS.rotationSpring },
  scaleSpring: { ...DRAG_SWING_DEFAULTS.scaleSpring },
});
