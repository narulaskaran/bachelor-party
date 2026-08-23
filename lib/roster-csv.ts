import type { Guest } from "@/lib/db/schema";

// Organizer-only full-detail roster CSV for P2-2. Cells are built from an
// explicit allowlist of columns so secrets (guestToken, adminToken, password)
// can never leak into an export, even if the guest row grows new fields.

const HEADERS = [
  "Name",
  "RSVP",
  "Party Size",
  "Plus One",
  "Phone",
  "Arrival Flight",
  "Arrival Time",
  "Departure Flight",
  "Departure Time",
  "Dietary",
  "Activity Votes",
  "Notes",
] as const;

/** RFC 4180 quoting: wrap in quotes when needed and double embedded quotes. */
function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return csvCell(text);
}

/** "rafting: hyped; hot-springs: pass" — stable, human-readable votes. */
export function activityVotesCell(prefs: Record<string, string> | null | undefined): string {
  if (!prefs) return "";
  return Object.entries(prefs)
    .map(([slug, vote]) => `${slug}: ${vote}`)
    .join("; ");
}

export function guestsToCsv(guests: Guest[]): string {
  const lines = [HEADERS.map(cell).join(",")];
  for (const guest of guests) {
    lines.push(
      [
        cell(guest.name),
        cell(guest.attendanceStatus),
        cell(guest.partySize),
        cell(guest.plusOneName),
        cell(guest.phone),
        cell(guest.arrivalFlight),
        cell(guest.arrivalTime),
        cell(guest.departureFlight),
        cell(guest.departureTime),
        cell(guest.dietary),
        csvCell(activityVotesCell(guest.activityPrefs)),
        cell(guest.notes),
      ].join(","),
    );
  }
  // Trailing CRLF keeps spreadsheet importers happy across platforms.
  return `${lines.join("\r\n")}\r\n`;
}
