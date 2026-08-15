/** Unmatched /api and /api/* paths must 404 JSON, not the HTML not-found page. */

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
import {
  DELETE as indexDELETE,
  GET as indexGET,
  HEAD as indexHEAD,
  OPTIONS as indexOPTIONS,
  PATCH as indexPATCH,
  POST as indexPOST,
  PUT as indexPUT,
} from "@/app/api/route";

async function expectNotFound(res: Response) {
  expect(res.status).toBe(404);
  expect(res.headers.get("content-type")).toMatch(/application\/json/);
  expect(await res.json()).toEqual({ error: "Not found" });
}

describe("GET /api and /api/ (API root, no subpath)", () => {
  it("GET /api and /api/ → 404 JSON, not Next's __next_error__ HTML", async () => {
    await expectNotFound(indexGET());
  });

  it("other methods on the API root also 404 JSON", async () => {
    await expectNotFound(indexPOST());
    await expectNotFound(indexPUT());
    await expectNotFound(indexPATCH());
    await expectNotFound(indexDELETE());
    await expectNotFound(indexHEAD());
    await expectNotFound(indexOPTIONS());
  });
});

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
