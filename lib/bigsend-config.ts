import { homedir } from "node:os";
import { join } from "node:path";

export type BigsendConfigFile = {
  tokens: Record<string, string>;
};

export function defaultConfigPath(env: Record<string, string | undefined> = process.env): string {
  return env.BIGSEND_CONFIG || join(homedir(), ".bigsend.json");
}

export function emptyConfig(): BigsendConfigFile {
  return { tokens: {} };
}

export function parseConfig(raw: string): BigsendConfigFile {
  try {
    const parsed = JSON.parse(raw) as { tokens?: Record<string, string> };
    return { tokens: parsed.tokens ?? {} };
  } catch {
    return emptyConfig();
  }
}

export function resolveToken(
  config: BigsendConfigFile,
  env: Record<string, string | undefined>,
  slug?: string,
): string | undefined {
  if (slug && config.tokens[slug]) return config.tokens[slug];
  return env.BIGSEND_TOKEN || undefined;
}
