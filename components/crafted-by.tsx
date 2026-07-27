export function CraftedBy() {
  return (
    <a
      className="inline-flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
      href="https://blode.co"
      rel="author noopener"
      target="_blank"
    >
      <span>Crafted by</span>
      {/* oxlint-disable-next-line next/no-img-element -- self-hosted 20px avatar; next/image would add a loader round trip for nothing */}
      <img
        alt="Matthew Blode"
        className="rounded-full"
        height={20}
        loading="lazy"
        src="/perfect-dnd/avatar-sm.png"
        width={20}
      />
      <span>Matthew Blode</span>
    </a>
  );
}
