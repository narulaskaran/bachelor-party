import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { END_BEFORE_START_MESSAGE } from "@/lib/trip-dates";
import { RESERVED_SLUGS } from "@/lib/slug";

export type Issue = {
  path: string;
  message: string;
  hint?: string;
};

const HINTS: Record<string, string> = {
  "content.trip.siteName": "The trip needs a name — that's the only required field.",
  "trip.siteName": "The trip needs a name — that's the only required field.",
  slug: "Use lowercase-kebab-case, e.g. jackson-26. Omit slug to autogenerate from the name.",
  reservedSlug: `These slugs collide with app routes: ${RESERVED_SLUGS.join(", ")}. Omit slug to autogenerate.`,
  password: "At least 4 characters, or omit it and we'll generate one.",
  kind: "Only kind \"trip\" is supported right now. Omit the field.",
  invertedDates: END_BEFORE_START_MESSAGE,
};

export function issuesFromZod(error: ZodError): Issue[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return {
      path: path || "(root)",
      message: issue.message,
      hint: hintFor(path, issue.message),
    };
  });
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Invalid JSON",
          issues: [
            {
              path: "(root)",
              message: "body is not valid JSON",
              hint: "Send a JSON object.",
            },
          ],
        },
        { status: 400 },
      ),
    };
  }
}

function hintFor(path: string, message: string): string | undefined {
  if (path === "slug" && message.toLowerCase().includes("reserved")) {
    return HINTS.reservedSlug;
  }
  if (
    message === END_BEFORE_START_MESSAGE ||
    (path.endsWith("endDate") && message.toLowerCase().includes("before start"))
  ) {
    return HINTS.invertedDates;
  }
  if (HINTS[path]) return HINTS[path];
  if (
    (path.startsWith("content.trip.") || path.startsWith("trip.")) &&
    message.includes("expected")
  ) {
    return "Airport, dates, and location are optional until you know them — omit the field instead of guessing.";
  }
  if (path === "kind" || path.endsWith(".kind")) {
    return HINTS.kind;
  }
  return undefined;
}
