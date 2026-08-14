import { parseArgs } from "node:util";
import {
  BigsendApiError,
  createBigsendClient,
  tripFrom,
  type BigsendClient,
  type CreateTripBody,
} from "@/lib/bigsend-api";
import { slugFromName } from "@/lib/slug";
import {
  defaultConfigPath,
  emptyConfig,
  parseConfig,
  resolveToken,
  type BigsendConfigFile,
} from "@/lib/bigsend-config";

export const USAGE = `bigsend — The Big Send admin CLI (HTTP only; no DATABASE_URL)

Env: BIGSEND_API_URL  BIGSEND_TOKEN  BIGSEND_CONFIG (optional path)

  bigsend create --name "E2E Smoke"
  bigsend get <slug>
  bigsend set <slug> --patch '{"trip":{"airport":"JAC"}}'
  bigsend lodging <slug> --name "Cabin"
  bigsend schedule add <slug> --day 2026-09-05 --title "Dinner"
  bigsend activities add <slug> --name "Hike"
  bigsend guests <slug>
  bigsend password <slug> --set new-password
  bigsend delete <slug> --yes
  bigsend create --file party.json
`;

export type RunIO = {
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  stdout: { write: (chunk: string) => void };
  stderr: { write: (chunk: string) => void };
  readFile: (path: string) => string;
  writeFile: (path: string, data: string) => void;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function printJson(io: RunIO, value: unknown) {
  io.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printErr(io: RunIO, value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  io.stderr.write(`${text}\n`);
}

function fail(io: RunIO, message: string, extra?: unknown): number {
  printErr(io, extra ?? { error: message });
  return 1;
}

function loadConfig(io: RunIO): { path: string; config: BigsendConfigFile } {
  const path = defaultConfigPath(io.env);
  try {
    return { path, config: parseConfig(io.readFile(path)) };
  } catch {
    return { path, config: emptyConfig() };
  }
}

function saveToken(io: RunIO, slug: string, token: string | null | undefined) {
  if (!token) return;
  const { path, config } = loadConfig(io);
  config.tokens[slug] = token;
  io.writeFile(path, `${JSON.stringify(config, null, 2)}\n`);
}

function clientFor(io: RunIO, slug?: string, globalOnly = false): BigsendClient | string {
  const apiUrl = io.env.BIGSEND_API_URL;
  if (!apiUrl) return "BIGSEND_API_URL is not set";
  const { config } = loadConfig(io);
  const token = globalOnly ? io.env.BIGSEND_TOKEN : resolveToken(config, io.env, slug);
  if (!token) {
    return slug
      ? `No token for '${slug}'. Set BIGSEND_TOKEN or create the trip first.`
      : "BIGSEND_TOKEN is not set";
  }
  return createBigsendClient({ apiUrl, token, fetch: io.fetch });
}

function parseJsonFlag(raw: string, flag: string): Record<string, unknown> {
  const value = JSON.parse(raw) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${flag} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function weekdayFromIsoDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return "Saturday";
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return WEEKDAYS[utc.getUTCDay()] ?? "Saturday";
}

function contentOf(record: Record<string, unknown>): Record<string, unknown> {
  const trip = tripFrom(record);
  const content = trip.content;
  if (content && typeof content === "object" && !Array.isArray(content)) {
    return content as Record<string, unknown>;
  }
  return {};
}

export async function runBigsend(argv: string[], io: RunIO): Promise<number> {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    io.stderr.write(USAGE);
    return argv.length === 0 ? 1 : 0;
  }

  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        name: { type: "string" },
        slug: { type: "string" },
        password: { type: "string" },
        file: { type: "string" },
        patch: { type: "string" },
        yes: { type: "boolean", short: "y" },
        day: { type: "string" },
        title: { type: "string" },
        time: { type: "string" },
        weekday: { type: "string" },
        label: { type: "string" },
        key: { type: "string" },
        note: { type: "string" },
        address: { type: "string" },
        url: { type: "string" },
        "maps-url": { type: "string" },
        "total-cost": { type: "string" },
        bedrooms: { type: "string" },
        beds: { type: "string" },
        bathrooms: { type: "string" },
        bucket: { type: "string" },
        description: { type: "string" },
        set: { type: "string" },
        marquee: { type: "boolean" },
      },
    });
  } catch (err) {
    return fail(io, err instanceof Error ? err.message : "Invalid arguments");
  }

  const [command, ...rest] = parsed.positionals;
  const flags = parsed.values;
  const flagStr = (key: string) => {
    const value = flags[key];
    return typeof value === "string" ? value : undefined;
  };

  try {
    switch (command) {
      case "create":
        return await cmdCreate(io, {
          name: flagStr("name"),
          slug: flagStr("slug"),
          password: flagStr("password"),
          file: flagStr("file"),
        });
      case "get":
        return await cmdGet(io, rest[0]);
      case "set":
        return await cmdSet(io, rest[0], { patch: flagStr("patch"), file: flagStr("file") });
      case "lodging":
        return await cmdLodging(io, rest[0], flags as Record<string, string | boolean | undefined>);
      case "schedule":
        if (rest[0] !== "add") return fail(io, "Usage: bigsend schedule add <slug> --day DATE --title TITLE");
        return await cmdScheduleAdd(io, rest[1], flags as Record<string, string | boolean | undefined>);
      case "activities":
        if (rest[0] !== "add") return fail(io, "Usage: bigsend activities add <slug> --name NAME");
        return await cmdActivitiesAdd(io, rest[1], flags as Record<string, string | boolean | undefined>);
      case "guests":
        return await cmdGuests(io, rest[0]);
      case "password":
        return await cmdPassword(io, rest[0], flagStr("set"));
      case "delete":
        return await cmdDelete(io, rest[0], flags.yes === true);
      default:
        return fail(io, `Unknown command '${command}'\n${USAGE}`);
    }
  } catch (err) {
    if (err instanceof BigsendApiError) {
      printErr(io, err.body ?? { error: err.message, status: err.status });
      return 1;
    }
    return fail(io, err instanceof Error ? err.message : "Command failed");
  }
}

async function cmdCreate(
  io: RunIO,
  flags: { name?: string; slug?: string; password?: string; file?: string },
): Promise<number> {
  const api = clientFor(io, undefined, true);
  if (typeof api === "string") return fail(io, api);

  let body: CreateTripBody;
  if (flags.file) {
    const file = JSON.parse(io.readFile(flags.file)) as Record<string, unknown>;
    if (file.content) {
      body = file as CreateTripBody;
    } else if (file.trip) {
      body = { content: file as CreateTripBody["content"] };
    } else {
      return fail(io, "--file needs content.trip or a full create payload");
    }
  } else if (flags.name) {
    body = { content: { trip: { siteName: flags.name } } };
  } else {
    return fail(io, "create requires --name or --file");
  }
  if (flags.slug) body.slug = flags.slug;
  if (flags.password) body.password = flags.password;

  const result = await api.create(body);
  const slug = String(result.slug ?? "");
  const adminToken = result.adminToken;
  saveToken(io, slug, typeof adminToken === "string" ? adminToken : undefined);
  printJson(io, {
    url: result.url,
    slug: result.slug,
    password: result.password,
    adminToken: result.adminToken,
  });
  return 0;
}

async function cmdGet(io: RunIO, slug?: string): Promise<number> {
  if (!slug) return fail(io, "Usage: bigsend get <slug>");
  const api = clientFor(io, slug);
  if (typeof api === "string") return fail(io, api);
  const result = await api.get(slug);
  printJson(io, tripFrom(result));
  return 0;
}

async function cmdSet(
  io: RunIO,
  slug: string | undefined,
  flags: { patch?: string; file?: string },
): Promise<number> {
  if (!slug) return fail(io, "Usage: bigsend set <slug> --patch JSON | --file FILE");
  const api = clientFor(io, slug);
  if (typeof api === "string") return fail(io, api);
  const raw = flags.patch ?? (flags.file ? io.readFile(flags.file) : undefined);
  if (!raw) return fail(io, "set requires --patch or --file");
  const parsed = parseJsonFlag(raw, flags.patch ? "--patch" : "--file");
  const content = (parsed.content as Record<string, unknown> | undefined) ?? parsed;
  const result = await api.patch(slug, { content });
  printJson(io, tripFrom(result));
  return 0;
}

async function cmdLodging(
  io: RunIO,
  slug: string | undefined,
  flags: Record<string, string | boolean | undefined>,
): Promise<number> {
  if (!slug) return fail(io, "Usage: bigsend lodging <slug> --name NAME");
  const name = typeof flags.name === "string" ? flags.name : undefined;
  if (!name) return fail(io, "lodging requires --name");
  const api = clientFor(io, slug);
  if (typeof api === "string") return fail(io, api);

  const lodging: Record<string, unknown> = { name };
  const map: [string, string, (v: string) => unknown][] = [
    ["address", "address", (v) => v],
    ["url", "url", (v) => v],
    ["maps-url", "mapsUrl", (v) => v],
    ["total-cost", "totalCost", (v) => v],
    ["bedrooms", "bedrooms", (v) => Number(v)],
    ["beds", "beds", (v) => Number(v)],
    ["bathrooms", "bathrooms", (v) => Number(v)],
  ];
  for (const [flag, key, coerce] of map) {
    const value = flags[flag];
    if (typeof value === "string") lodging[key] = coerce(value);
  }

  const result = await api.patch(slug, { content: { lodging } });
  printJson(io, tripFrom(result));
  return 0;
}

async function cmdScheduleAdd(
  io: RunIO,
  slug: string | undefined,
  flags: Record<string, string | boolean | undefined>,
): Promise<number> {
  if (!slug) return fail(io, "Usage: bigsend schedule add <slug> --day DATE --title TITLE");
  const day = typeof flags.day === "string" ? flags.day : undefined;
  const title = typeof flags.title === "string" ? flags.title : undefined;
  if (!day || !title) return fail(io, "schedule add requires --day and --title");
  const api = clientFor(io, slug);
  if (typeof api === "string") return fail(io, api);

  const current = contentOf(await api.get(slug));
  const schedule = Array.isArray(current.schedule)
    ? [...(current.schedule as Record<string, unknown>[])]
    : [];
  const weekday =
    (typeof flags.weekday === "string" && flags.weekday) || weekdayFromIsoDate(day);
  // Default key is the ISO date so two Saturdays on a longer trip don't merge.
  const key = (typeof flags.key === "string" && flags.key) || day;
  const label = (typeof flags.label === "string" && flags.label) || weekday;
  const entry: Record<string, unknown> = { title };
  if (typeof flags.time === "string") entry.time = flags.time;
  if (typeof flags.note === "string") entry.note = flags.note;
  if (flags.marquee === true) entry.marquee = true;

  const existing = schedule.findIndex((d) => d.key === key || d.date === day);
  if (existing >= 0) {
    const dayRow = { ...schedule[existing] };
    const entries = Array.isArray(dayRow.entries) ? [...dayRow.entries] : [];
    entries.push(entry);
    dayRow.entries = entries;
    schedule[existing] = dayRow;
  } else {
    schedule.push({
      key,
      date: day,
      weekday,
      label,
      timed: Boolean(entry.time),
      entries: [entry],
    });
  }

  const result = await api.patch(slug, { content: { schedule } });
  printJson(io, tripFrom(result));
  return 0;
}

async function cmdActivitiesAdd(
  io: RunIO,
  slug: string | undefined,
  flags: Record<string, string | boolean | undefined>,
): Promise<number> {
  if (!slug) return fail(io, "Usage: bigsend activities add <slug> --name NAME");
  const name = typeof flags.name === "string" ? flags.name : undefined;
  if (!name) return fail(io, "activities add requires --name");
  const api = clientFor(io, slug);
  if (typeof api === "string") return fail(io, api);

  const bucketRaw = typeof flags.bucket === "string" ? flags.bucket : "core";
  const bucket =
    bucketRaw === "ifTimeAllows" || bucketRaw === "backups" || bucketRaw === "core"
      ? bucketRaw
      : null;
  if (!bucket) return fail(io, "--bucket must be core, ifTimeAllows, or backups");

  const current = contentOf(await api.get(slug));
  const activities = {
    ...((current.activities as Record<string, unknown> | undefined) ?? {}),
  };
  const list = Array.isArray(activities[bucket]) ? [...(activities[bucket] as unknown[])] : [];
  const activitySlug =
    (typeof flags.slug === "string" && flags.slug) || slugFromName(name) || "activity";
  const activity: Record<string, unknown> = { slug: activitySlug, name };
  if (typeof flags.description === "string") activity.description = flags.description;
  list.push(activity);
  activities[bucket] = list;

  const result = await api.patch(slug, { content: { activities } });
  printJson(io, tripFrom(result));
  return 0;
}

async function cmdGuests(io: RunIO, slug?: string): Promise<number> {
  if (!slug) return fail(io, "Usage: bigsend guests <slug>");
  const api = clientFor(io, slug);
  if (typeof api === "string") return fail(io, api);
  printJson(io, await api.guests(slug));
  return 0;
}

async function cmdPassword(io: RunIO, slug: string | undefined, next?: string): Promise<number> {
  if (!slug || !next) return fail(io, "Usage: bigsend password <slug> --set PASSWORD");
  const api = clientFor(io, slug);
  if (typeof api === "string") return fail(io, api);
  const result = await api.patch(slug, { password: next });
  printJson(io, tripFrom(result));
  return 0;
}

async function cmdDelete(io: RunIO, slug: string | undefined, yes: boolean): Promise<number> {
  if (!slug) return fail(io, "Usage: bigsend delete <slug> --yes");
  if (!yes) return fail(io, "delete requires --yes");
  const api = clientFor(io, slug);
  if (typeof api === "string") return fail(io, api);
  printJson(io, await api.delete(slug));
  return 0;
}
