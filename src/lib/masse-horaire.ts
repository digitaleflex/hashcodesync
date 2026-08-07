type Slot = { day: number; startTime: string; endTime: string };

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Masse horaire hebdomadaire (en heures) calculée depuis les disponibilités.
// On fusionne les créneaux qui se chevauchent/s'enchaînent (par jour) pour ne
// pas compter deux fois la même fenêtre, puis on somme la durée de chaque jour.
export function computeMassHours(slots: Slot[]): number {
  const byDay = new Map<number, [number, number][]>();
  for (const slot of slots) {
    const start = toMin(slot.startTime);
    const end = toMin(slot.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const arr = byDay.get(slot.day) ?? [];
    arr.push([start, end]);
    byDay.set(slot.day, arr);
  }

  let totalMin = 0;
  for (const intervals of byDay.values()) {
    intervals.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    // Fusion des intervalles qui se chevauchent ou se touchent.
    const merged: [number, number][] = [];
    for (const [s, e] of intervals) {
      const last = merged[merged.length - 1];
      if (last && s <= last[1]) {
        if (e > last[1]) last[1] = e;
      } else {
        merged.push([s, e]);
      }
    }
    for (const [s, e] of merged) totalMin += e - s;
  }

  // Arrondi à la demi-heure la plus proche.
  const hours = totalMin / 60;
  return Math.round(hours * 2) / 2;
}