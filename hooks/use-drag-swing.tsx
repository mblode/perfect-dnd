"use client";

import type { DragMoveEvent } from "@dnd-kit/core";
import { useDndMonitor } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import { autorun, toJS } from "mobx";
import { useCallback, useEffect, useRef } from "react";

import {
  centerBoxOn,
  findOverlayCard,
  LIFTED_SHADOW,
  SHADOW_FADE_MS,
} from "@/lib/dnd/dom";
import type { SettleOrigin } from "@/lib/dnd/drag-phase";
import { getPointerPosition } from "@/lib/dnd/pointer-tracker";
import type { SpringLoop } from "@/lib/spring/loop";
import { runSpringLoop } from "@/lib/spring/loop";
import { REST_SCALE } from "@/lib/spring/settings";
import { createSpring } from "@/lib/spring/spring";
import type { Point } from "@/lib/spring/velocity";
import {
  createVelocityTracker,
  velocityToRotation,
} from "@/lib/spring/velocity";
import { useStore } from "@/lib/stores/store";

export interface UseDragSwingOptions {
  /**
   * Fires once, when the pointer is released. `origin` describes where the
   * card was so a settle can start from it, or is null when there is nothing
   * to settle: a cancelled drag, or a card that left the DOM mid-drag.
   */
  onRelease(origin: SettleOrigin | null): void;
}

export interface UseDragSwingReturn {
  /** Attach to the element carrying the rotation transform. */
  overlayRef: React.RefObject<HTMLDivElement | null>;
  /** Attach to the element carrying the scale transform. */
  scaleRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Resample at most this often. Pointer events stop firing when the pointer
 * holds still, so the loop re-samples the last known position to let the
 * measured velocity, and with it the tilt, decay back to zero.
 */
const RESAMPLE_INTERVAL_MS = 16;

const SHADOW_LIFT_EASING = "cubic-bezier(.2, 0, 0, 1)";

/**
 * Tilts and scales the drag overlay from pointer velocity.
 *
 * Mounted by the overlay, which React renders only once a drag is already in
 * flight. dnd-kit has therefore already dispatched `onDragStart` by the time
 * this hook can register a monitor, so mounting *is* the drag-start signal and
 * there is deliberately no `onDragStart` handler here.
 *
 * The hook owns no application state. It reports the release upward and lets
 * the caller decide what the drag lifecycle does next.
 */
export function useDragSwing({
  onRelease,
}: UseDragSwingOptions): UseDragSwingReturn {
  const store = useStore();

  const overlayRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);

  // Physics updates every frame and must never trigger a render, so all of it
  // lives in refs and is written straight to the DOM.
  const settingsRef = useRef(toJS(store.dragSwingSettings));
  const rotationSpringRef = useRef(
    createSpring(settingsRef.current.rotationSpring)
  );
  const scaleSpringRef = useRef(createSpring(settingsRef.current.scaleSpring));
  const velocityRef = useRef(createVelocityTracker());
  const loopRef = useRef<SpringLoop | null>(null);

  const isDraggingRef = useRef(true);
  const dragStartPointerRef = useRef<Point | null>(null);
  const lastPointerRef = useRef<Point | null>(null);
  const lastSampleTimeRef = useRef<number | null>(null);
  const currentRotationRef = useRef(0);
  const currentScaleRef = useRef(REST_SCALE);

  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  // Live settings: toJS deep-reads the observable, which both establishes
  // tracking on the nested spring fields and yields a plain snapshot.
  useEffect(() => {
    return autorun(() => {
      const settings = toJS(store.dragSwingSettings);
      settingsRef.current = settings;
      rotationSpringRef.current.setConfig(settings.rotationSpring);
      scaleSpringRef.current.setConfig(settings.scaleSpring);
    });
  }, [store]);

  const applyRotation = useCallback((degrees: number) => {
    overlayRef.current?.style.setProperty("--motion-rotate", `${degrees}deg`);
  }, []);

  const applyScale = useCallback((scale: number) => {
    scaleRef.current?.style.setProperty("--motion-scale", `${scale}`);
  }, []);

  /** Record a position and steer the tilt spring at the resulting velocity. */
  const samplePointer = useCallback((now: number, pointer: Point) => {
    const settings = settingsRef.current;
    const velocity = velocityRef.current.sample(
      pointer,
      now,
      settings.velocityWindowMs
    );

    rotationSpringRef.current.setTarget(
      velocityToRotation(
        velocity.x,
        settings.velocityScale,
        settings.maxRotation
      )
    );
    scaleSpringRef.current.setTarget(settings.dragScale);
    lastSampleTimeRef.current = now;
  }, []);

  // Drive the springs for as long as the card is held. Mount is drag start.
  useEffect(() => {
    const rotationSpring = rotationSpringRef.current;
    const scaleSpring = scaleSpringRef.current;

    const startPointer = getPointerPosition();
    dragStartPointerRef.current = startPointer;
    lastPointerRef.current = startPointer;

    rotationSpring.setCurrent(0);
    scaleSpring.setCurrent(REST_SCALE);
    scaleSpring.setTarget(settingsRef.current.dragScale);
    applyRotation(0);
    applyScale(REST_SCALE);

    const loop = runSpringLoop({
      untilRest: false,
      onFrame(now) {
        const pointer = lastPointerRef.current;
        const lastSample = lastSampleTimeRef.current;
        if (
          isDraggingRef.current &&
          pointer &&
          (lastSample === null || now - lastSample > RESAMPLE_INTERVAL_MS)
        ) {
          samplePointer(now, pointer);
        }

        const rotation = rotationSpring.step(now);
        const scale = scaleSpring.step(now);
        currentRotationRef.current = rotation.value;
        currentScaleRef.current = scale.value;
        applyRotation(rotation.value);
        applyScale(scale.value);

        return rotation.atRest && scale.atRest;
      },
    });
    loopRef.current = loop;

    const card = findOverlayCard(overlayRef.current);
    const shadow = card?.animate(
      [{ boxShadow: "0 0 0 0 rgba(0, 0, 0, 0)" }, { boxShadow: LIFTED_SHADOW }],
      {
        duration: SHADOW_FADE_MS,
        easing: SHADOW_LIFT_EASING,
        fill: "forwards",
      }
    );

    return () => {
      loop.cancel();
      loopRef.current = null;
      shadow?.cancel();
    };
  }, [applyRotation, applyScale, samplePointer]);

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      // Prefer the live pointer from the sensor. dnd-kit's delta is measured
      // from the activation point, so the fallback reconstructs the pointer
      // from that origin rather than reusing a stale absolute position.
      const tracked = getPointerPosition();
      const origin =
        dragStartPointerRef.current ??
        getEventCoordinates(event.activatorEvent);
      const pointer =
        tracked ??
        (origin
          ? { x: origin.x + event.delta.x, y: origin.y + event.delta.y }
          : null);

      if (!pointer) {
        return;
      }

      lastPointerRef.current = pointer;
      samplePointer(performance.now(), pointer);
    },
    [samplePointer]
  );

  /**
   * Reads where the card is right now, so the settle can continue from it
   * without a visible jump.
   */
  const readSettleOrigin = useCallback((): SettleOrigin | null => {
    const card = findOverlayCard(overlayRef.current);
    if (!card) {
      return null;
    }

    const rect = card.getBoundingClientRect();
    const size = {
      width: card.offsetWidth || rect.width,
      height: card.offsetHeight || rect.height,
    };

    return {
      rect: { ...centerBoxOn(rect, size), ...size },
      rotation: currentRotationRef.current,
      scale: currentScaleRef.current || REST_SCALE,
    };
  }, []);

  const handleRelease = useCallback(
    (settle: boolean) => {
      isDraggingRef.current = false;
      lastPointerRef.current = null;
      lastSampleTimeRef.current = null;
      velocityRef.current.reset();

      // Measure before reporting: the caller's state change unmounts this
      // overlay, and the element goes with it.
      const origin = settle ? readSettleOrigin() : null;

      loopRef.current?.cancel();
      loopRef.current = null;
      onReleaseRef.current(origin);
    },
    [readSettleOrigin]
  );

  const handleDragEnd = useCallback(() => handleRelease(true), [handleRelease]);
  const handleDragCancel = useCallback(
    () => handleRelease(false),
    [handleRelease]
  );

  useDndMonitor({
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragCancel,
  });

  return { overlayRef, scaleRef };
}
