/** Guest packing checks: per browser, per trip slug. Not a shared roster. */

const listeners = new Set<() => void>();

/** False until subscribe runs so the first client snapshot matches SSR (null). */
let clientSnapshotEnabled = false;

export function packingStorageKey(slug: string): string {
  return `bigsend:pack:${slug}`;
}

export function parsePackingChecks(raw: string | null): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const checks: Record<string, boolean> = {};
    for (const [title, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === true) checks[title] = true;
    }
    return checks;
  } catch {
    return {};
  }
}

export function serializePackingChecks(checks: Record<string, boolean>): string {
  const compact: Record<string, boolean> = {};
  for (const [title, value] of Object.entries(checks)) {
    if (value) compact[title] = true;
  }
  return JSON.stringify(compact);
}

export function subscribePackingChecks(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStoreChange);
    clientSnapshotEnabled = true;
  }
  return () => {
    listeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStoreChange);
    }
    if (listeners.size === 0) clientSnapshotEnabled = false;
  };
}

export function getPackingChecksSnapshot(slug: string): string | null {
  if (typeof window === "undefined" || !clientSnapshotEnabled) return null;
  try {
    return window.localStorage.getItem(packingStorageKey(slug));
  } catch {
    return null;
  }
}

export function writePackingChecks(slug: string, checks: Record<string, boolean>): void {
  try {
    window.localStorage.setItem(packingStorageKey(slug), serializePackingChecks(checks));
  } catch {
    // Private mode / quota — still notify so this tab can update.
  }
  for (const listener of listeners) listener();
}
