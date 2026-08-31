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
  primary: "#b45309",
  "primary-foreground": "#fff7ed",
  ring: "#b45309",
  muted: "#eeebe8",
  "muted-foreground": "#57534e",
  border: "#e7e5e4",
  input: "#e7e5e4",
} as const;

const DARK = {
  background: "#0c0a09",
  foreground: "#ededed",
  primary: "#d97706",
  "primary-foreground": "#1c1917",
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

  it("gives primary buttons and light muted copy at least 4.5:1 contrast", () => {
    const light = blockVars(css, ":root");
    expect(contrastRatio(light.primary, light["primary-foreground"])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.primary, light.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.background, light["muted-foreground"])).toBeGreaterThanOrEqual(4.5);
    const dark = blockVars(css, ".dark");
    expect(contrastRatio(dark.primary, dark["primary-foreground"])).toBeGreaterThanOrEqual(4.5);
  });
});

function srgbChannel(hexPair: string): number {
  const c = Number.parseInt(hexPair, 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = srgbChannel(value.slice(0, 2));
  const g = srgbChannel(value.slice(2, 4));
  const b = srgbChannel(value.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const [hi, lo] = first > second ? [first, second] : [second, first];
  return (hi + 0.05) / (lo + 0.05);
}
