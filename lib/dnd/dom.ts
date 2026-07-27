/**
 * The DOM contract between the cards and the overlays that animate them.
 *
 * The overlays live outside the sortable list and cannot be handed refs into
 * it, so they find their counterparts by data attribute. Keeping the attribute
 * names, the markers that write them, and the lookups that read them in one
 * file means a single grep finds both ends of the contract.
 *
 * `app/globals.css` is a third reader: it styles these attributes directly
 * (touch-action on sortable items, GPU hints on the overlay card), so renaming
 * one here means editing that file too.
 */

// Deliberately not exported: the markers and finders below are the API. A
// caller holding a raw attribute name would hand-roll a selector and bypass
// the contract this module exists to keep in one place.

/** Set by the in-flight overlay card; read to animate its shadow. */
const OVERLAY_CARD_ATTRIBUTE = "data-overlay-card";

/** Set by the list card a settling overlay is flying back to. */
const SETTLING_TARGET_ATTRIBUTE = "data-settling-target";

/** Set by every list card. Styled only; nothing queries it from JS. */
const SORTABLE_ITEM_ATTRIBUTE = "data-sortable-item";

/** Spread onto the in-flight overlay card so `findOverlayCard` can reach it. */
export const overlayCardMarker = () => ({ [OVERLAY_CARD_ATTRIBUTE]: "" });

/**
 * Spread onto every list card. Carries the iOS touch rules in `globals.css`
 * that keep a press-and-hold drag from turning into a scroll or a callout.
 */
export const sortableItemMarker = () => ({ [SORTABLE_ITEM_ATTRIBUTE]: "" });

/**
 * Spread onto a list card while it is the settle destination. Pass null when
 * it is not: an always-present attribute would make every card a match.
 */
export const settlingTargetMarker = (blockId: string | null) => ({
  [SETTLING_TARGET_ATTRIBUTE]: blockId ?? undefined,
});

export const findOverlayCard = (root: HTMLElement | null): HTMLElement | null =>
  root?.querySelector<HTMLElement>(`[${OVERLAY_CARD_ATTRIBUTE}]`) ?? null;

/**
 * Returns null when the list card is not mounted, which happens if the block
 * is removed mid-drag. Callers must treat that as "nothing to fly back to"
 * rather than assuming the element is there.
 */
export const findSettlingTarget = (blockId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    `[${SETTLING_TARGET_ATTRIBUTE}="${CSS.escape(blockId)}"]`
  );

interface Box {
  width: number;
  height: number;
}

/**
 * Position a box of `size` so its centre sits on the centre of `rect`.
 *
 * Both overlays need this because `getBoundingClientRect` reports the
 * *transformed* box, which a tilt inflates, so the untransformed layout size
 * has to be re-centred on the transformed centre to avoid a visible jump.
 */
export const centerBoxOn = (
  rect: { left: number; top: number; width: number; height: number },
  size: Box
): { left: number; top: number } => ({
  left: rect.left + rect.width / 2 - size.width / 2,
  top: rect.top + rect.height / 2 - size.height / 2,
});

/** Shadow under a card while it is lifted off the list. */
export const LIFTED_SHADOW =
  "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 12px 24px -8px rgba(0, 0, 0, 0.1)";

/** Same geometry at zero opacity, so the shadow fades rather than snapping. */
export const FLAT_SHADOW =
  "0 25px 50px -12px rgba(0, 0, 0, 0), 0 12px 24px -8px rgba(0, 0, 0, 0)";

export const SHADOW_FADE_MS = 200;

/** Above dnd-kit's own overlay, which defaults to 999. */
export const SETTLING_OVERLAY_Z_INDEX = 9999;
