export const RSVP_ATTENDANCE = ["attending", "maybe", "not-attending"] as const;
export type RsvpAttendance = (typeof RSVP_ATTENDANCE)[number];

/** Guest identity is the browser-bound person; the response is mutable state. */
export type GuestIdentity = {
  id: number;
  partyId: number;
  guestToken: string;
  name: string;
  nameKey: string;
};

export type RsvpResponse = {
  attendanceStatus: RsvpAttendance;
  partySize: number;
  plusOneName: string | null;
};

export type RsvpConfig = {
  plusOnePolicy?: "not-allowed" | "allowed";
  /** Backward-compatible shorthand for hosts configuring JSON directly. */
  allowPlusOne?: boolean;
  maxPartySize?: number;
};

export type RsvpSubmission = {
  attendance?: unknown;
  partySize?: unknown;
  plusOneName?: unknown;
};

export type RsvpSubmissionResult =
  | { ok: true; value: RsvpResponse }
  | { ok: false; error: string };

function plusOneAllowed(config?: RsvpConfig): boolean {
  if (config?.plusOnePolicy === "not-allowed") return false;
  return config?.plusOnePolicy === "allowed" || config?.allowPlusOne === true;
}

export function parseRsvpSubmission(
  input: RsvpSubmission,
  config?: RsvpConfig,
): RsvpSubmissionResult {
  const attendanceStatus = String(input.attendance ?? "attending").trim() as RsvpAttendance;
  if (!RSVP_ATTENDANCE.includes(attendanceStatus)) {
    return { ok: false, error: "Choose attending, maybe, or not attending." };
  }

  const rawPartySize = input.partySize == null || input.partySize === "" ? 1 : Number(input.partySize);
  if (!Number.isInteger(rawPartySize) || rawPartySize < 0) {
    return { ok: false, error: "Party size must be a whole number." };
  }

  const partySize = attendanceStatus === "not-attending" ? 0 : rawPartySize;
  if (attendanceStatus !== "not-attending" && partySize < 1) {
    return { ok: false, error: "Attending guests must include at least one person." };
  }

  const maxPartySize = Math.max(1, Math.min(20, config?.maxPartySize ?? 10));
  if (partySize > maxPartySize) {
    return { ok: false, error: `Party size cannot exceed ${maxPartySize}.` };
  }
  if (partySize > 1 && !plusOneAllowed(config)) {
    return { ok: false, error: "This trip does not allow plus-ones." };
  }

  const rawPlusOneName = String(input.plusOneName ?? "").trim();
  if (rawPlusOneName.length > 80) {
    return { ok: false, error: "Plus-one name must be 80 characters or fewer." };
  }

  return {
    ok: true,
    value: {
      attendanceStatus,
      partySize,
      plusOneName: partySize >= 2 ? rawPlusOneName || null : null,
    },
  };
}

export type RsvpSummary = {
  responses: number;
  attending: number;
  maybe: number;
  notAttending: number;
  expectedPeople: number;
};

export function summarizeRsvps(
  responses: Array<Pick<RsvpResponse, "attendanceStatus" | "partySize">>,
): RsvpSummary {
  return responses.reduce<RsvpSummary>(
    (summary, response) => {
      summary.responses += 1;
      summary[response.attendanceStatus === "not-attending" ? "notAttending" : response.attendanceStatus] += 1;
      if (response.attendanceStatus !== "not-attending") summary.expectedPeople += response.partySize;
      return summary;
    },
    { responses: 0, attending: 0, maybe: 0, notAttending: 0, expectedPeople: 0 },
  );
}
