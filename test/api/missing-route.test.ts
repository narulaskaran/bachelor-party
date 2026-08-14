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

async function expectNotFound(res: Response) {
  expect(res.status).toBe(404);
  expect(res.headers.get("content-type")).toMatch(/application\/json/);
  expect(await res.json()).toEqual({ error: "Not found" });
}

describe("missing /api/* routes", () => {
  it("GET of a missing /api/* path → 404 JSON", async () => {
    await expectNotFound(GET());
  });

  it("POST of a missing /api/* path → 404 JSON", async () => {
    await expectNotFound(POST());
  });

  it("other methods also 404 JSON", async () => {
    await expectNotFound(PUT());
    await expectNotFound(PATCH());
    await expectNotFound(DELETE());
    await expectNotFound(HEAD());
    await expectNotFound(OPTIONS());
  });
});
