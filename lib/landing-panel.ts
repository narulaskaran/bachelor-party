import { LEGACY_PAGE_HASHES } from "@/lib/legacy-page-redirects";

export type LandingPanel = "create" | "enter";

const LEGACY_ENTER_HASHES: ReadonlySet<string> = new Set(LEGACY_PAGE_HASHES);

export function landingPanelHash(panel: LandingPanel): `#${LandingPanel}` {
  return `#${panel}`;
}

/** Map the homepage hash to the host or invite panel. Legacy page hashes open invite. */
export function panelFromHash(hash: string): LandingPanel | null {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (id === "create") return "create";
  if (id === "enter" || LEGACY_ENTER_HASHES.has(id)) return "enter";
  return null;
}
