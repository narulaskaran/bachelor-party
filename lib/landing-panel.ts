export type LandingPanel = "create";

export function landingPanelHash(panel: LandingPanel): `#${LandingPanel}` {
  return `#${panel}`;
}

/** Map the homepage hash to the host create panel. */
export function panelFromHash(hash: string): LandingPanel | null {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  return id === "create" ? "create" : null;
}
