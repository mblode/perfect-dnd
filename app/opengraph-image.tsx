import { renderZoneOgImage } from "@/app/og-image-shared";

export {
  OG_CONTENT_TYPE as contentType,
  OG_SIZE as size,
} from "@/app/og-image-shared";

export const alt = "Perfect DnD: drag and drop made simple";

/**
 * The house card (Rule 12), replacing the static `opengraph-image.png`.
 *
 * Converting the PNG to a generated route is also the Rule 11 fix, which is
 * why `metadataBase` moves to the zone URL in the same commit. A static
 * metadata image already carries `basePath`, so pointing `metadataBase` at the
 * zone while the PNG is still there produces
 * `/perfect-dnd/perfect-dnd/opengraph-image.png`. A generated route is not
 * prefixed, so this form is the one that cannot double.
 */
export default function OpengraphImage() {
  return renderZoneOgImage({
    badge: "PERFECT DND",
    eyebrow: "blode.co/perfect-dnd",
    // Shorter than the meta description, which runs long for the SERP. A card
    // is read in a feed, at a glance.
    subtitle: "Drag, drop, and settle animations tuned until lists feel right.",
    title: "Perfect DnD: drag and drop made simple",
  });
}
