"use client";

import { observer } from "mobx-react-lite";
import { useLayoutEffect, useRef } from "react";

import {
  findSettlingTarget,
  FLAT_SHADOW,
  LIFTED_SHADOW,
  SETTLING_OVERLAY_Z_INDEX,
  SHADOW_FADE_MS,
} from "@/lib/dnd/dom";
import type { SettleOrigin } from "@/lib/dnd/drag-phase";
import { runSpringLoop } from "@/lib/spring/loop";
import { POSITION_SPRING_CONFIG, REST_SCALE } from "@/lib/spring/settings";
import { createSpring } from "@/lib/spring/spring";
import { useStore } from "@/lib/stores/store";
import type { BlockData } from "@/types/block";

import { CardInner } from "./card-inner";

interface SettlingOverlayProps {
  block: BlockData;
  /** Where the card was when the pointer was released. */
  origin: SettleOrigin;
  onComplete: () => void;
}

/**
 * Flies a released card back into its slot in the list.
 *
 * Runs outside dnd-kit, which drops its own overlay the moment the pointer
 * comes up. Position, tilt, and scale each get their own spring so the card
 * can still be rotating as it arrives.
 */
export const SettlingOverlay = observer(
  ({ block, origin, onComplete }: SettlingOverlayProps) => {
    const store = useStore();
    const positionRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // Read once when the settle starts: moving a slider mid-flight should not
    // restart the animation.
    const settingsRef = useRef(store.dragSwingSettings);
    settingsRef.current = store.dragSwingSettings;

    useLayoutEffect(() => {
      const position = positionRef.current;
      const transform = transformRef.current;
      const card = cardRef.current;
      const target = findSettlingTarget(block.id);

      if (!(position && transform && card && target)) {
        // Nothing to fly back to: the list card is gone, or the overlay never
        // mounted. Hand control back rather than stranding the card mid-air.
        onComplete();
        return;
      }

      const { rect } = origin;
      const targetBox = target.getBoundingClientRect();
      const targetLeft = targetBox.left + targetBox.width / 2 - rect.width / 2;
      const targetTop = targetBox.top + targetBox.height / 2 - rect.height / 2;

      const settings = settingsRef.current;
      const xSpring = createSpring(POSITION_SPRING_CONFIG);
      const ySpring = createSpring(POSITION_SPRING_CONFIG);
      const rotationSpring = createSpring(settings.rotationSpring);
      const scaleSpring = createSpring(settings.scaleSpring);

      xSpring.setCurrent(rect.left);
      xSpring.setTarget(targetLeft);
      ySpring.setCurrent(rect.top);
      ySpring.setTarget(targetTop);
      rotationSpring.setCurrent(origin.rotation);
      rotationSpring.setTarget(0);
      scaleSpring.setCurrent(origin.scale);
      scaleSpring.setTarget(REST_SCALE);

      const draw = (left: number, top: number, scale: number, deg: number) => {
        position.style.transform = `translate(${left}px, ${top}px)`;
        transform.style.transform = `scale(${scale}) rotate(${deg}deg)`;
      };

      // Linear fade; the shadow is not carrying any physics.
      const shadow = card.animate(
        [{ boxShadow: LIFTED_SHADOW }, { boxShadow: FLAT_SHADOW }],
        { duration: SHADOW_FADE_MS, easing: "ease-out", fill: "forwards" }
      );

      const loop = runSpringLoop({
        untilRest: true,
        onFrame(now) {
          const x = xSpring.step(now);
          const y = ySpring.step(now);
          const rotation = rotationSpring.step(now);
          const scale = scaleSpring.step(now);

          draw(x.value, y.value, scale.value, rotation.value);

          return x.atRest && y.atRest && rotation.atRest && scale.atRest;
        },
        onEnd() {
          // Land exactly on target, whether the springs rested or timed out.
          draw(targetLeft, targetTop, REST_SCALE, 0);
          onComplete();
        },
      });

      return () => {
        loop.cancel();
        shadow.cancel();
      };
    }, [block.id, origin, onComplete]);

    return (
      <div
        className="pointer-events-none fixed top-0 left-0"
        ref={positionRef}
        style={{
          width: origin.rect.width,
          height: origin.rect.height,
          transform: `translate(${origin.rect.left}px, ${origin.rect.top}px)`,
          zIndex: SETTLING_OVERLAY_Z_INDEX,
        }}
      >
        <div
          className="h-full w-full origin-center"
          ref={transformRef}
          style={{
            transform: `scale(${origin.scale}) rotate(${origin.rotation}deg)`,
          }}
        >
          <div
            className="rounded-xl border border-border bg-white p-4"
            ref={cardRef}
            style={{ boxShadow: LIFTED_SHADOW }}
          >
            <CardInner block={block} />
          </div>
        </div>
      </div>
    );
  }
);

SettlingOverlay.displayName = "SettlingOverlay";
