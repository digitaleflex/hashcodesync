// Génération iCalendar (RFC 5545). Utilisé par l'export unitaire d'atelier et
// le flux d'abonnement par membre (/api/calendar/[token]).

const ICAL_DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]; // index 0 = Lundi

/** Échappe les valeurs texte : \ , ; et retours ligne (RFC 5545 §3.3.11). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Date → format UTC « YYYYMMDDTHHMMSSZ ». */
export function formatIcsUtc(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}` +
    `${p(date.getUTCMonth() + 1)}` +
    `${p(date.getUTCDate())}` +
    `T${p(date.getUTCHours())}` +
    `${p(date.getUTCMinutes())}` +
    `${p(date.getUTCSeconds())}Z`
  );
}

/** Pliage à 75 octets (RFC 5545 §3.1) : continuation « CRLF + espace ». */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

/** Décalage en minutes d'un fuseau IANA à un instant donné (ex : 60 pour UTC+1). */
export function tzOffsetMinutes(timeZone: string, at: Date = new Date()): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Convertit une date-heure murale exprimée dans `timeZone` vers un instant UTC. */
export function zonedWallTimeToUtc(
  timeZone: string,
  y: number,
  m: number, // 1-12
  d: number,
  hh: number,
  mm: number,
): Date {
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let guess = new Date(naive - tzOffsetMinutes(timeZone, new Date(naive)) * 60000);
  // Réajustement unique : si l'offset au point deviné diffère (changement d'heure).
  guess = new Date(naive - tzOffsetMinutes(timeZone, guess) * 60000);
  return guess;
}

export type IcsEvent = {
  uid: string;
  start: Date;
  end?: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  transparent?: boolean;
  /** Récurrence hebdomadaire : jour de la semaine (0 = Lundi … 6 = Dimanche). */
  weeklyByDay?: number;
};

export function buildVCalendar(options: {
  name: string;
  events: IcsEvent[];
  timezone?: string;
  now?: Date;
}): string {
  const { name, events, timezone, now = new Date() } = options;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HashCode Sync//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(name)}`,
    ...(timezone ? [`X-WR-TIMEZONE:${timezone}`] : []),
    "REFRESH-INTERVAL;VALUE=DURATION:PT4H",
    "X-PUBLISHED-TTL:PT4H",
  ];

  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${formatIcsUtc(now)}`,
    );
    if (e.weeklyByDay !== undefined) {
      lines.push(
        `DTSTART:${formatIcsUtc(e.start)}`,
        `DTEND:${formatIcsUtc(e.end ?? new Date(e.start.getTime() + 3600000))}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${ICAL_DAYS[e.weeklyByDay] ?? "MO"}`,
      );
    } else {
      lines.push(
        `DTSTART:${formatIcsUtc(e.start)}`,
        `DTEND:${formatIcsUtc(e.end ?? new Date(e.start.getTime() + 3600000))}`,
      );
    }
    lines.push(`SUMMARY:${escapeIcsText(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeIcsText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeIcsText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.transparent) lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
