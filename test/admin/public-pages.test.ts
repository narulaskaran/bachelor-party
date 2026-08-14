import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ADMIN_LOGIN_ERROR } from "@/lib/admin-ui";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
    set: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/app/admin/login/admin-login-form", () => ({
  AdminLoginForm: () => null,
}));

import AdminLayout from "@/app/admin/(protected)/layout";
import LoginPage from "@/app/admin/login/page";
import { adminLogin } from "@/app/admin/login/actions";

const ENV_KEY = "ADMIN_UI_PASSWORD";

function formData(password: string): FormData {
  const data = new FormData();
  data.set("password", password);
  return data;
}

describe("public /admin and /admin/login", () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env[ENV_KEY];
    delete process.env[ENV_KEY];
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (saved !== undefined) {
      process.env[ENV_KEY] = saved;
    } else {
      delete process.env[ENV_KEY];
    }
    vi.mocked(console.error).mockRestore();
  });

  it("GET /admin (unconfigured) does not contain ADMIN_UI_PASSWORD", async () => {
    const html = renderToStaticMarkup(
      await AdminLayout({ children: createElement("div") }),
    );
    expect(html).not.toContain("ADMIN_UI_PASSWORD");
    expect(html).not.toContain("ADMIN_API_TOKEN");
    expect(html).toContain("Admin isn");
    expect(html).toContain("t available");
    expect(String(vi.mocked(console.error).mock.calls[0]?.[0])).toContain(
      "ADMIN_UI_PASSWORD",
    );
  });

  it("GET /admin/login (unconfigured) does not contain ADMIN_UI_PASSWORD", async () => {
    const html = renderToStaticMarkup(await LoginPage());
    expect(html).not.toContain("ADMIN_UI_PASSWORD");
    expect(html).not.toContain("ADMIN_API_TOKEN");
    expect(html).toContain("Admin isn");
    expect(html).toContain("t available");
    expect(String(vi.mocked(console.error).mock.calls[0]?.[0])).toContain(
      "ADMIN_UI_PASSWORD",
    );
  });

  it("failed /admin/login when unconfigured does not mention ADMIN_UI_PASSWORD", async () => {
    const result = await adminLogin({}, formData("guess"));
    expect(result.error).toBe(ADMIN_LOGIN_ERROR);
    expect(result.error).not.toContain("ADMIN_UI_PASSWORD");
    expect(result.error).not.toContain("ADMIN_API_TOKEN");
    expect(String(vi.mocked(console.error).mock.calls[0]?.[0])).toContain(
      "ADMIN_UI_PASSWORD",
    );
  });

  it("wrong password and unconfigured login both use a generic public error", async () => {
    const unconfigured = await adminLogin({}, formData("guess"));

    process.env[ENV_KEY] = "correct-horse";
    const wrong = await adminLogin({}, formData("guess"));

    expect(unconfigured.error).toBe(ADMIN_LOGIN_ERROR);
    expect(wrong.error).toBe(ADMIN_LOGIN_ERROR);
    expect(unconfigured.error).toBe(wrong.error);
    expect(unconfigured.error).not.toContain("ADMIN_UI_PASSWORD");
  });
});
