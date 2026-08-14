#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBigsendMcpServer } from "../lib/bigsend-mcp";

async function main() {
  const server = createBigsendMcpServer({
    env: process.env,
    fetch: globalThis.fetch,
    stdout: process.stderr,
    stderr: process.stderr,
    readFile: (path) => readFileSync(path, "utf8"),
    writeFile: (path, data) => writeFileSync(path, data, "utf8"),
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
