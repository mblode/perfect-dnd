import { EditorPage } from "@/components/dnd-kit/dnd-kit-page";
import { ZoneBreadcrumb } from "@/components/zone-breadcrumb";

const SITE_URL = "https://blode.co/perfect-dnd";

/**
 * One script, one `@graph`. Identity is referenced by `@id` only: blode.co owns
 * the bodies of `#person`, `#website` and `#organization`, and minting a second
 * one here would publish a second human on the same domain.
 *
 * The type is a bare `WebPage`. This is a demo of a drag interaction, not a
 * product: `SoftwareApplication` without `offers` cannot earn a rich result,
 * and the other way to earn one is a rating Google's guidelines forbid the
 * author from writing. See zone-conventions.md Rule 3.
 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: "Perfect DnD",
      description:
        "A dnd-kit demo with the drag, drop, and settle animations tuned until reordering a list feels right.",
      inLanguage: "en",
      isPartOf: { "@id": "https://blode.co/#website" },
      breadcrumb: { "@id": `${SITE_URL}/#breadcrumb` },
      author: { "@id": "https://blode.co/#person" },
      publisher: { "@id": "https://blode.co/#organization" },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Matthew Blode",
          item: "https://blode.co/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Projects",
          item: "https://blode.co/projects",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Perfect DnD",
          item: SITE_URL,
        },
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      {/* Static object literal, no user input. */}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        type="application/ld+json"
      />

      {/* Same width as the list below it. `product` matches the third crumb
          exactly: Google reads a mismatch between the visible trail and the
          markup as an error. */}
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <ZoneBreadcrumb product="Perfect DnD" />
      </div>

      <EditorPage />
    </>
  );
}
