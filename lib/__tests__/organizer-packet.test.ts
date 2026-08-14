import { describe, it, expect } from "vitest";
import { organizerPacket } from "@/lib/organizer-packet";

describe("organizerPacket", () => {
  it("builds a guest URL from the request origin", () => {
    const request = new Request("https://preview.example/api/admin/parties");
    expect(
      organizerPacket(request, {
        slug: "jackson-hole-26",
        password: "secret-pw",
        adminToken: "tok",
      }),
    ).toEqual({
      url: "https://preview.example/jackson-hole-26",
      slug: "jackson-hole-26",
      password: "secret-pw",
      adminToken: "tok",
    });
  });
});
