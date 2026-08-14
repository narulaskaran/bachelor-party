/** Unmatched /api/* paths must 404 JSON, not the HTML not-found page. */

import { describe, it, expect } from "vitest";
import {
  DELETE,
  GET,
  HEAD,
  OPTIONS,
  PATCH,
  POST,
  PUT,
} from "@/app/api/[...path]/route";

function missingRequest(method: string, path = "/api/rsvp") {
  return new Request(`http://localhost${path}`, { method });
}

async function expectNotFound(res: Response) {
  expect(res.status).toBe(404);
  expect(res.headers.get("content-type")).toMatch(/application\/json/);
  expect(await res.json()).toEqual({ error: "Not found" });
}

describe("missing /api/* routes", () => {
  it("GET /api/rsvp → 404 JSON", async () => {
    await expectNotFound(await GET(missingRequest("GET")));
  });

  it("POST /api/rsvp → 404 JSON", async () => {
    await expectNotFound(await POST(missingRequest("POST")));
  });

  it("GET /api/health → 404 JSON", async () => {
    await expectNotFound(await GET(missingRequest("GET", "/api/health")));
  });

  it("other methods also 404 JSON", async () => {
    await expectNotFound(await PUT(missingRequest("PUT")));
    await expectNotFound(await PATCH(missingRequest("PATCH")));
    await expectNotFound(await DELETE(missingRequest("DELETE")));
    await expectNotFound(await HEAD(missingRequest("HEAD")));
    await expectNotFound(await OPTIONS(missingRequest("OPTIONS")));
  });
});
