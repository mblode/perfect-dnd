/**
 * The DOM contract between the cards and the overlays that animate them.
 *
 * The overlays live outside the sortable list and cannot be handed refs to it,
 * so they find their counterparts by data attribute. Keeping the attribute
 * names and the lookups here means one grep finds every end of the contract.
 *
 * `app/globals.css` styles all three attributes. Renaming one here means
 * renaming its selector there; nothing in the type system will catch it.
 */

/** Set by the in-flight overlay card; read to animate its shadow. */
export const OVERLAY_CARD_ATTRIBUTE = "data-overlay-card";

/** Set by the list card a settling overlay is flying back to. */
export const SETTLING_TARGET_ATTRIBUTE = "data-settling-target";

/**
 * Set by every card in the list. No JS reads it: it exists so `globals.css`
 * can apply the iOS touch rules (no callout, no text selection) that stop a
 * long-press drag from opening a context menu or selecting the card's text.
 */
export const SORTABLE_ITEM_ATTRIBUTE = "data-sortable-item";

/** Spread onto the in-flight overlay card so `findOverlayCard` can reach it. */
export const overlayCardMarker = () => ({ [OVERLAY_CARD_ATTRIBUTE]: "" });

/** Spread onto every list card, for the touch rules in `globals.css`. */
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

/** Shadow under a card while it is lifted off the list. */
export const LIFTED_SHADOW =
  "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 12px 24px -8px rgba(0, 0, 0, 0.1)";

/** Same geometry at zero opacity, so the shadow fades rather than snapping. */
export const FLAT_SHADOW =
  "0 25px 50px -12px rgba(0, 0, 0, 0), 0 12px 24px -8px rgba(0, 0, 0, 0)";

export const SHADOW_FADE_MS = 200;

/** Above dnd-kit's own overlay, which defaults to 999. */
export const SETTLING_OVERLAY_Z_INDEX = 9999;
