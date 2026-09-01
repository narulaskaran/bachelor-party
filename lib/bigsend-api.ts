export class BigsendApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "BigsendApiError";
  }
}

export type CreateTripBody = {
  slug?: string;
  password?: string;
  plan?: string;
  preset?: "night-out" | "weekend" | "celebration";
  siteName?: string;
  content?: { trip: { siteName: string }; [key: string]: unknown };
};

export type PatchTripBody = {
  password?: string;
  content?: Record<string, unknown>;
};

export type BigsendClient = {
  create: (body: CreateTripBody) => Promise<Record<string, unknown>>;
  get: (slug: string) => Promise<Record<string, unknown>>;
  patch: (slug: string, body: PatchTripBody) => Promise<Record<string, unknown>>;
  publish: (slug: string) => Promise<Record<string, unknown>>;
  delete: (slug: string) => Promise<Record<string, unknown>>;
  guests: (slug: string) => Promise<Record<string, unknown>>;
  deleteGuest: (slug: string, id: number) => Promise<Record<string, unknown>>;
};

export function createBigsendClient(opts: {
  apiUrl: string;
  token?: string;
  fetch?: typeof fetch;
}): BigsendClient {
  const base = opts.apiUrl.replace(/\/$/, "");
  const fetchFn = opts.fetch ?? globalThis.fetch;

  async function request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Record<string, unknown>> {
    const res = await fetchFn(`${base}${path}`, {
      method,
      headers: {
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const message =
        (json && typeof json.error === "string" && json.error) ||
        `${method} ${path} failed (${res.status})`;
      throw new BigsendApiError(message, res.status, json);
    }
    return json ?? {};
  }

  return {
    create: (body) => request("POST", "/api/admin/trips", body),
    get: (slug) => request("GET", `/api/admin/trips/${encodeURIComponent(slug)}`),
    patch: (slug, body) =>
      request("PATCH", `/api/admin/trips/${encodeURIComponent(slug)}`, body),
    publish: (slug) =>
      request("POST", `/api/admin/trips/${encodeURIComponent(slug)}/publish`),
    delete: (slug) => request("DELETE", `/api/admin/trips/${encodeURIComponent(slug)}`),
    guests: (slug) => request("GET", `/api/admin/trips/${encodeURIComponent(slug)}/guests`),
    deleteGuest: (slug, id) =>
      request("DELETE", `/api/admin/trips/${encodeURIComponent(slug)}/guests/${id}`),
  };
}

export function tripFrom(record: Record<string, unknown>): Record<string, unknown> {
  const inner = (record.trip ?? record.party) as Record<string, unknown> | undefined;
  return inner ?? record;
}
