import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runBigsend, type RunIO } from "@/lib/bigsend-cli";

type ToolArgs = Record<string, string | boolean | undefined>;

export const BIGSEND_TOOL_NAMES = [
  "create",
  "get",
  "set",
  "lodging_set",
  "schedule_add",
  "activities_add",
  "guests",
  "password",
  "delete",
] as const;

export type BigsendToolName = (typeof BIGSEND_TOOL_NAMES)[number];

type ToolDef = {
  name: BigsendToolName;
  description: string;
  inputSchema: z.ZodRawShape;
};

export const BIGSEND_TOOLS: ToolDef[] = [
  {
    name: "create",
    description: 'Create a trip. Example: { "name": "E2E Smoke" }',
    inputSchema: {
      name: z.string().optional().describe("Trip name (siteName)"),
      file: z.string().optional().describe("Path to a create JSON file"),
      slug: z.string().optional(),
      password: z.string().optional(),
    },
  },
  {
    name: "get",
    description: "Get a trip record. Example: { \"slug\": \"e2e-smoke\" }",
    inputSchema: { slug: z.string() },
  },
  {
    name: "set",
    description: 'Merge-patch trip content. Example: { "slug": "e2e-smoke", "patch": "{\\"trip\\":{\\"airport\\":\\"JAC\\"}}" }',
    inputSchema: {
      slug: z.string(),
      patch: z.string().optional().describe("JSON object (merge patch)"),
      file: z.string().optional(),
    },
  },
  {
    name: "lodging_set",
    description: 'Set lodging. Example: { "slug": "e2e-smoke", "name": "Cabin" }',
    inputSchema: {
      slug: z.string(),
      name: z.string(),
      address: z.string().optional(),
      url: z.string().optional(),
      mapsUrl: z.string().optional(),
      totalCost: z.string().optional(),
      bedrooms: z.string().optional(),
      beds: z.string().optional(),
      bathrooms: z.string().optional(),
    },
  },
  {
    name: "schedule_add",
    description: 'Add a schedule entry. Example: { "slug": "e2e-smoke", "day": "2026-09-05", "title": "Dinner" }',
    inputSchema: {
      slug: z.string(),
      day: z.string().describe("ISO date YYYY-MM-DD"),
      title: z.string(),
      time: z.string().optional(),
      weekday: z.string().optional(),
      label: z.string().optional(),
      key: z.string().optional(),
      note: z.string().optional(),
      marquee: z.boolean().optional(),
    },
  },
  {
    name: "activities_add",
    description: 'Add an activity. Example: { "slug": "e2e-smoke", "name": "Hike" }',
    inputSchema: {
      slug: z.string(),
      name: z.string(),
      slugName: z.string().optional().describe("Activity slug; defaults from name"),
      bucket: z.enum(["core", "ifTimeAllows", "backups"]).optional(),
      description: z.string().optional(),
    },
  },
  {
    name: "guests",
    description: 'List RSVPs. Example: { "slug": "e2e-smoke" }',
    inputSchema: { slug: z.string() },
  },
  {
    name: "password",
    description: 'Replace the guest password. Example: { "slug": "e2e-smoke", "password": "new-password" }',
    inputSchema: { slug: z.string(), password: z.string() },
  },
  {
    name: "delete",
    description: 'Delete a trip. Requires yes=true. Example: { "slug": "e2e-smoke", "yes": true }',
    inputSchema: {
      slug: z.string(),
      yes: z.literal(true).describe("Must be true; refuses otherwise"),
    },
  },
];

function pushFlag(argv: string[], name: string, value?: string | boolean) {
  if (value === undefined || value === false) return;
  if (value === true) argv.push(`--${name}`);
  else argv.push(`--${name}`, value);
}

export function argvForTool(name: BigsendToolName, args: ToolArgs): string[] {
  switch (name) {
    case "create": {
      const argv = ["create"];
      pushFlag(argv, "name", args.name);
      pushFlag(argv, "file", args.file);
      pushFlag(argv, "slug", args.slug);
      pushFlag(argv, "password", args.password);
      return argv;
    }
    case "get":
      return ["get", String(args.slug ?? "")];
    case "set": {
      const argv = ["set", String(args.slug ?? "")];
      pushFlag(argv, "patch", args.patch);
      pushFlag(argv, "file", args.file);
      return argv;
    }
    case "lodging_set": {
      const argv = ["lodging", String(args.slug ?? "")];
      pushFlag(argv, "name", args.name);
      pushFlag(argv, "address", args.address);
      pushFlag(argv, "url", args.url);
      pushFlag(argv, "maps-url", args.mapsUrl);
      pushFlag(argv, "total-cost", args.totalCost);
      pushFlag(argv, "bedrooms", args.bedrooms);
      pushFlag(argv, "beds", args.beds);
      pushFlag(argv, "bathrooms", args.bathrooms);
      return argv;
    }
    case "schedule_add": {
      const argv = ["schedule", "add", String(args.slug ?? "")];
      pushFlag(argv, "day", args.day);
      pushFlag(argv, "title", args.title);
      pushFlag(argv, "time", args.time);
      pushFlag(argv, "weekday", args.weekday);
      pushFlag(argv, "label", args.label);
      pushFlag(argv, "key", args.key);
      pushFlag(argv, "note", args.note);
      pushFlag(argv, "marquee", args.marquee);
      return argv;
    }
    case "activities_add": {
      const argv = ["activities", "add", String(args.slug ?? "")];
      pushFlag(argv, "name", args.name);
      pushFlag(argv, "slug", args.slugName);
      pushFlag(argv, "bucket", args.bucket);
      pushFlag(argv, "description", args.description);
      return argv;
    }
    case "guests":
      return ["guests", String(args.slug ?? "")];
    case "password": {
      const argv = ["password", String(args.slug ?? "")];
      pushFlag(argv, "set", args.password);
      return argv;
    }
    case "delete": {
      const argv = ["delete", String(args.slug ?? "")];
      pushFlag(argv, "yes", args.yes);
      return argv;
    }
  }
}

export async function executeBigsendTool(
  name: BigsendToolName,
  args: ToolArgs,
  io: RunIO,
): Promise<{ text: string; isError: boolean; code: number }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await runBigsend(argvForTool(name, args), {
    ...io,
    stdout: { write: (c) => void stdout.push(c) },
    stderr: { write: (c) => void stderr.push(c) },
  });
  const text = (code === 0 ? stdout.join("") : stderr.join("") || stdout.join("")).trim();
  return { text, isError: code !== 0, code };
}

export function createBigsendMcpServer(io: RunIO): McpServer {
  const server = new McpServer({ name: "bigsend", version: "0.1.0" });
  for (const tool of BIGSEND_TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (args) => {
        const result = await executeBigsendTool(tool.name, args as ToolArgs, io);
        return {
          content: [{ type: "text" as const, text: result.text || (result.isError ? "error" : "ok") }],
          isError: result.isError,
        };
      },
    );
  }
  return server;
}
