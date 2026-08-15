import { renderZoneOgImage } from "@/app/og-image-shared";
import { OgLogo } from "@/app/og-logo";

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
    background: "#f8fafc",
    color: "#0f172a",
    logo: <OgLogo />,
    title: "Perfect DnD",
  });
}
