// Fuseaux horaires. La cohorte raisonne dans un fuseau de référence ; les
// disponibilités de chaque membre (exprimées dans SON fuseau) sont converties
// vers ce référentiel avant tout calcul commun (heatmap / recommandations).

export const REFERENCE_TIMEZONE =
  process.env.REFERENCE_TIMEZONE ?? "Africa/Porto-Novo";

export const REFERENCE_LABEL = `heures en ${REFERENCE_TIMEZONE}`;

export type RefAvailability = {
  day: number; // 0=Lundi..6=Dimanche, dans le fuseau de référence
  startMin: number;
  endMin: number;
  userTz: string;
  weight?: number; // probabilité pᵢ de présence (optionnel)
};

type ZoneClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

// Cache d'instances Intl.DateTimeFormat par fuseau : leur construction est
// coûteuse et appelée des milliers de fois lors des conversions de dispo.
const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getDtf(tz: string): Intl.DateTimeFormat {
  let dtf = dtfCache.get(tz);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      // second: "2-digit",
      hourCycle: "h23",
    });
    dtfCache.set(tz, dtf);
  }
  return dtf;
}

// Décompose un instant (ms UTC) dans un fuseau donné.
function partsInTz(instant: number, tz: string): ZoneClock {
  const dtf = getDtf(tz);
  const parts = dtf.formatToParts(instant);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

// Décalage (ms) du fuseau à cet instant = (heure locale vue comme UTC) - instant.
export function staticOffset(tz: string, instant: number) {
  const p = partsInTz(instant, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - instant;
}

// Heure locale (y,m,d,h,min) -> instant UTC réel.
export function wallToUtc(y: number, m: number, d: number, h: number, min: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d, h, min);
  return guess - staticOffset(tz, guess);
}

// Jour ISO (0=Lundi..6=Dimanche) d'une date grégorienne.
export function isoWeekday(y: number, m: number, d: number) {
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (w + 6) % 7;
}

// Convertit une fenêtre hebdomadaire locale [jour, "HH:mm", "HH:mm"] (fuseau
// du membre) en fenêtre dans le fuseau de référence.
export function convertAvailability(
  day: number,
  startTime: string,
  endTime: string,
  userTz: string,
  refTz = REFERENCE_TIMEZONE,
  now = new Date()
): RefAvailability {
  // On ancre la semaine dans le fuseau LOCAL du membre, sinon les offset
  // négatifs (ex. New York) décale le jour vers la veille.
  const calNow = partsInTz(now.getTime(), userTz);
  const isoNow = isoWeekday(calNow.year, calNow.month, calNow.day);
  const delta = day - isoNow;
  const occurrence = new Date(now.getTime() + delta * 86400000);

  const cal = partsInTz(occurrence.getTime(), userTz);
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  const sUtc = wallToUtc(cal.year, cal.month, cal.day, sh, sm, userTz);
  const eUtc = wallToUtc(cal.year, cal.month, cal.day, eh, em, userTz);

  const sRef = partsInTz(sUtc, refTz);
  const eRef = partsInTz(eUtc, refTz);
  const sDay = isoWeekday(sRef.year, sRef.month, sRef.day);
  const eDay = isoWeekday(eRef.year, eRef.month, eRef.day);

  const startMin = sRef.hour * 60 + sRef.minute;
  // Si la fin retombe le jour suivant dans le référentiel, on la borne à 24h.
  const endMin = eDay === sDay ? eRef.hour * 60 + eRef.minute : 1440;

  return { day: sDay, startMin, endMin, userTz };
}

// Convertit une liste de dispo brutes (avec fuseau par user) en référentiel.
export function convertToReference(
  rows: {
    day: number;
    startTime: string;
    endTime: string;
    userTz: string;
    weight?: number;
  }[],
  refTz = REFERENCE_TIMEZONE,
  now = new Date()
): RefAvailability[] {
  // Fast-path : quand le membre est déjà dans le fuseau de référence (cas le
  // plus fréquent), la conversion est un simple (day, minute) sans date.
  if (rows.every((r) => r.userTz === refTz)) {
    const hm = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    return rows.map((r) => {
      const a: RefAvailability = {
        day: r.day,
        startMin: hm(r.startTime),
        endMin: hm(r.endTime),
        userTz: r.userTz,
      };
      if (r.weight !== undefined) a.weight = r.weight;
      return a;
    });
  }
  return rows.map((r) => {
    const a = convertAvailability(r.day, r.startTime, r.endTime, r.userTz, refTz, now);
    if (r.weight !== undefined) a.weight = r.weight;
    return a;
  });
}