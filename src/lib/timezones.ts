// Liste complète des fuseaux IANA (supportée par le runtime) + détection du
// fuseau du navigateur. Ce module est client-safe (pas d'accès au serveur).

export const DEFAULT_TIMEZONE = "Africa/Porto-Novo";

export type TzRegion = { region: string; zones: string[] };

// Tous les fuseaux du monde, groupés par région (Africa, America, Asia, ...).
export function getAllTimezones(): TzRegion[] {
  const zones = Intl.supportedValuesOf("timeZone");
  const map = new Map<string, string[]>();
  for (const z of zones) {
    const region = z.includes("/") ? z.split("/")[0] : "Autres";
    if (!map.has(region)) map.set(region, []);
    map.get(region)!.push(z);
  }
  return [...map.entries()]
    .map(([region, list]) => ({ region, zones: list }))
    .sort((a, b) => a.region.localeCompare(b.region));
}

// Fuseau de l'utilisateur d'après son navigateur, ou défaut de l'app.
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
