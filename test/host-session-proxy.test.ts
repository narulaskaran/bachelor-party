import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { HOST_COOKIE } from "@/lib/host-auth";
import { proxy } from "@/proxy";

const HOST_SESSION = `42.${"a".repeat(64)}`;

describe("host session navigation", () => {
  it("renews an existing host session cookie on a document navigation", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/", {
        headers: { cookie: `${HOST_COOKIE}=${HOST_SESSION}` },
      }),
    );

    expect(response.cookies.get(HOST_COOKIE)).toMatchObject({
      name: HOST_COOKIE,
      value: HOST_SESSION,
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
      httpOnly: true,
      sameSite: "lax",
    });
  });

  it("does not mint a host session when the request has no host cookie", async () => {
    const response = await proxy(new NextRequest("http://localhost/"));

    expect(response.cookies.get(HOST_COOKIE)).toBeUndefined();
  });
});
