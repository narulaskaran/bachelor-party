import { describe, it, expect } from "vitest";
import {
  BIGSEND_TOOL_NAMES,
  BIGSEND_TOOLS,
  argvForTool,
  executeBigsendTool,
} from "@/lib/bigsend-mcp";
import type { RunIO } from "@/lib/bigsend-cli";

function ioHarness(fetchImpl: typeof fetch): RunIO {
  const files: Record<string, string> = {};
  return {
    env: {
      BIGSEND_API_URL: "https://preview.example",
      BIGSEND_TOKEN: "global-token",
      BIGSEND_CONFIG: "/tmp/bigsend-mcp.json",
    },
    fetch: fetchImpl,
    stdout: { write: () => undefined },
    stderr: { write: () => undefined },
    readFile: (path) => {
      if (!(path in files)) throw new Error(`ENOENT ${path}`);
      return files[path];
    },
    writeFile: (path, data) => {
      files[path] = data;
    },
  };
}

describe("bigsend MCP tools", () => {
  it("exposes the CLI verbs with input schemas", () => {
    expect(BIGSEND_TOOL_NAMES).toEqual([
      "create",
      "get",
      "set",
      "lodging_set",
      "schedule_add",
      "activities_add",
      "guests",
      "password",
      "delete",
    ]);
    for (const tool of BIGSEND_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.description).toMatch(/example/i);
      expect(tool.inputSchema).toBeTruthy();
    }
    expect(BIGSEND_TOOLS.find((t) => t.name === "delete")?.inputSchema.yes).toBeTruthy();
  });

  it("create with only a name hits POST /api/admin/trips", async () => {
    const calls: { method: string; url: string; body: unknown }[] = [];
    const io = ioHarness(async (url, init) => {
      calls.push({
        method: init?.method ?? "GET",
        url: String(url),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return new Response(
        JSON.stringify({
          url: "https://preview.example/e2e-smoke",
          slug: "e2e-smoke",
          password: "guest-pw",
          adminToken: "tok",
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    });

    const result = await executeBigsendTool("create", { name: "E2E Smoke" }, io);
    expect(result.isError).toBe(false);
    expect(calls).toEqual([
      {
        method: "POST",
        url: "https://preview.example/api/admin/trips",
        body: { content: { trip: { siteName: "E2E Smoke" } } },
      },
    ]);
    expect(JSON.parse(result.text).slug).toBe("e2e-smoke");
  });

  it("delete argv includes --yes only when yes is true", () => {
    expect(argvForTool("delete", { slug: "cabin", yes: true })).toEqual([
      "delete",
      "cabin",
      "--yes",
    ]);
    expect(argvForTool("delete", { slug: "cabin" })).toEqual(["delete", "cabin"]);
  });
});
