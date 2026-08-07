const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export function formatDateFr(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start.getTime() + 6 * 86400000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = (dt: Date) => `${pad(dt.getUTCDate())} ${MONTHS[dt.getUTCMonth()]}`;
  return `du ${d(start)} au ${d(end)} ${start.getUTCFullYear()}`;
}