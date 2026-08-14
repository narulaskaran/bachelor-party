#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";
import { runBigsend } from "../lib/bigsend-cli";

async function main() {
  const code = await runBigsend(process.argv.slice(2), {
    env: process.env,
    fetch: globalThis.fetch,
    stdout: process.stdout,
    stderr: process.stderr,
    readFile: (path) => readFileSync(path, "utf8"),
    writeFile: (path, data) => writeFileSync(path, data, "utf8"),
  });
  process.exit(code);
}

void main();
