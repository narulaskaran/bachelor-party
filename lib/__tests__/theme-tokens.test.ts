import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");
const THEME_CSS = join(ROOT, "app/globals.css");
const FORBIDDEN = [/#131813/i, /#e08a3c/i];
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "coverage", "dist", "out"]);
const SCAN_EXT = new Set([
  ".css",
  ".svg",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".html",
]);

const LIGHT = {
  background: "#f5f5f4",
  foreground: "#171717",
  primary: "#d97706",
  ring: "#d97706",
  muted: "#eeebe8",
  "muted-foreground": "#71717a",
  border: "#e7e5e4",
  input: "#e7e5e4",
} as const;

const DARK = {
  background: "#0c0a09",
  foreground: "#ededed",
  primary: "#d97706",
  ring: "#d97706",
  muted: "#292524",
  border: "#292524",
  "muted-foreground": "#a1a1aa",
} as const;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (!SCAN_EXT.has(extname(entry.name))) continue;
    const rel = relative(ROOT, full);
    if (rel.includes("__tests__") || /\.(test|spec)\./.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

function blockVars(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match?.[1]) throw new Error(`No ${selector} block in theme CSS`);
  const vars: Record<string, string> = {};
  for (const line of match[1].split(";")) {
    const prop = line.match(/--([a-z0-9-]+)\s*:\s*(\S+)/i);
    if (prop) vars[prop[1]] = prop[2].trim().toLowerCase();
  }
  return vars;
}

function expectTokens(
  vars: Record<string, string>,
  expected: Record<string, string>,
) {
  for (const [name, value] of Object.entries(expected)) {
    expect(vars[name], `--${name}`).toBe(value);
  }
}

describe("theme tokens", () => {
  const css = readFileSync(THEME_CSS, "utf8");

  it("drops spruce #131813 and ember #e08a3c from theme files and source", () => {
    const hits: string[] = [];
    for (const file of walk(ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        if (pattern.test(text)) hits.push(relative(ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it("uses stone paper light tokens on :root", () => {
    expectTokens(blockVars(css, ":root"), LIGHT);
  });

  it("uses stone charcoal dark tokens on .dark", () => {
    expectTokens(blockVars(css, ".dark"), DARK);
  });
});
