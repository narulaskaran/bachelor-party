/** Tab-scoped host key for Save/Publish when the httpOnly cookie is missing. Never log the value. */

const HOST_KEY_STORAGE = "bp-host-key";

const listeners = new Set<() => void>();

export function hostKeyStorageKey(slug: string): string {
  return `${HOST_KEY_STORAGE}:${slug}`;
}

export function subscribeHostKeyStore(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function notifyHostKeyStore() {
  for (const listener of listeners) listener();
}

export function readStoredHostKey(slug: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const value = sessionStorage.getItem(hostKeyStorageKey(slug))?.trim();
  return value || undefined;
}

export function rememberHostKey(slug: string, hostKey: string): void {
  if (typeof window === "undefined") return;
  const value = hostKey.trim();
  if (!value) return;
  sessionStorage.setItem(hostKeyStorageKey(slug), value);
  notifyHostKeyStore();
}
