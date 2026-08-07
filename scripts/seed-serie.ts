/* eslint-disable no-console */
// Script : crée une SÉRIE (programme regroupé) dans HashCode Sync et planifie
// chacun de ses ateliers sur le MEILLEUR créneau calculé depuis les stats de la
// cohorte (computeScheduling : WIS pondéré par probabilité de présence).
//
// Usage : npx tsx scripts/seed-serie.ts
//   --group="HashCode Team"     groupe dont on lit les dispo (défaut)
//   --series="Bootcamp HashCode"
//   --count=4                   nombre d'ateliers dans la série (<= 6)
//   --window=2                  durée de chaque atelier en heures
//   --owner=<email>             propriétaire de la série (défaut : un admin)
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { computeScheduling, SlotAvail } from "../src/lib/scheduling";
import {
  convertToReference,
  REFERENCE_TIMEZONE,
  wallToUtc,
  isoWeekday,
} from "../src/lib/timezone";
import { computeMassHours } from "../src/lib/masse-horaire";
import { presenceProbability } from "../src/lib/probability";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function arg(name: string, def: string) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
}

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// Prochaine date calendrier (année-mois-jour) dont le jour ISO vaut `day`,
// strictement après aujourd'hui.
function nextOccurrence(day: number, from = new Date()) {
  for (let i = 1; i <= 14; i++) {
    const probe = new Date(from.getTime() + i * DAY_MS);
    if (isoWeekday(probe.getUTCFullYear(), probe.getUTCMonth() + 1, probe.getUTCDate()) === day) {
      return probe;
    }
  }
  throw new Error("nextOccurrence: jour introuvable dans 14 jours");
}

const DAY_MS = 86400000;

async function main() {
  const groupName = arg("group", "HashCode Team");
  const seriesName = arg("series", "Bootcamp HashCode");
  const count = Math.max(1, Math.min(6, Number(arg("count", "4"))));
  const windowHours = Math.max(1, Math.min(4, Number(arg("window", "2"))));
  const ownerEmail = process.argv.find((a) => a.startsWith("--owner="))?.split("=")[1];

  const group = await prisma.group.findFirst({
    where: { name: groupName },
    select: { id: true },
  });
  if (!group) throw new Error(`Groupe '${groupName}' introuvable`);

  let ownerId: string;
  if (ownerEmail) {
    const u = await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true } });
    if (!u) throw new Error(`Utilisateur '${ownerEmail}' introuvable`);
    ownerId = u.id;
  } else {
    const admin = await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } });
    if (!admin) throw new Error("Aucun admin trouvé ; passez --owner=<email>");
    ownerId = admin.id;
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId: group.id },
    include: {
      user: {
        select: {
          id: true,
          timezone: true,
          attendances: { select: { status: true } },
          availabilities: {
            where: { groupId: group.id, activityId: null },
            select: { day: true, startTime: true, endTime: true },
          },
        },
      },
    },
  });

  if (members.length === 0) {
    throw new Error("Aucun membre dans le groupe ; lancez d'abord scripts/seed-members.ts");
  }

  const rows = members
    .map((m) => {
      const slots = m.user.availabilities;
      if (slots.length === 0) return [];
      const mass = computeMassHours(slots.map((s) => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })));
      const { present, absent } = m.user.attendances.reduce(
        (acc, a) => {
          if (a.status === "present") acc.present++;
          else if (a.status === "absent") acc.absent++;
          return acc;
        },
        { present: 0, absent: 0 }
      );
      const weight = presenceProbability({ present, absent }, mass);
      return slots.map((s) => ({ day: s.day, startTime: s.startTime, endTime: s.endTime, userTz: m.user.timezone, weight }));
    })
    .flat();

  const ref = convertToReference(rows);
  const scheduling = computeScheduling(
    ref.map((a): SlotAvail => ({ day: a.day, startMin: a.startMin, endMin: a.endMin, weight: a.weight ?? 1 })),
    members.length,
    windowHours,
    { smooth: true }
  );

  const top = scheduling.recommendation.slice(0, count);
  if (top.length === 0) throw new Error("Aucun créneau recommandé trouvé.");

  console.log(`Meilleurs créneaux (sur ${members.length} membres) :`);
  for (const s of top) {
    console.log(`  ${WEEKDAYS[s.day]} ${s.startTime}–${s.endTime}  (≈${s.available} présences, ${s.percent}%)`);
  }

  const series = await prisma.workshopSeries.create({
    data: {
      name: seriesName,
      description: `Programme planifié sur les meilleurs créneaux de la disponibilité collective (${count} ateliers, ~${windowHours}h chacun).`,
      createdBy: ownerId,
    },
  });

  const now = new Date();
  let i = 0;
  for (const s of top) {
    i++;
    const occ = nextOccurrence(s.day, now);
    const [eh] = s.endTime.split(":").map(Number);
    const startUtc = wallToUtc(occ.getUTCFullYear(), occ.getUTCMonth() + 1, occ.getUTCDate(), s.startHour, 0, REFERENCE_TIMEZONE);
    const endUtc = wallToUtc(occ.getUTCFullYear(), occ.getUTCMonth() + 1, occ.getUTCDate(), eh, 0, REFERENCE_TIMEZONE);

    const workshop = await prisma.workshop.create({
      data: {
        title: `${seriesName} — atelier ${i}`,
        description: `Créneau recommandé #${i} (${s.percent}% de la cohorte dispo, ≈${s.available} présences attendues) · ${WEEKDAYS[s.day]} ${s.startTime}–${s.endTime} (${REFERENCE_TIMEZONE}).`,
        startAt: new Date(startUtc),
        endAt: new Date(endUtc),
        createdBy: ownerId,
        seriesId: series.id,
      },
    });
    await prisma.participant.createMany({
      data: members.map((m) => ({ workshopId: workshop.id, userId: m.userId, status: "invited" })),
      skipDuplicates: true,
    });

    console.log(`  ✓ ${workshop.title} → ${new Date(startUtc).toISOString()} (${WEEKDAYS[s.day]} ${s.startTime})`);
  }

  console.log(`\nSérie créée : ${series.id} (${top.length} ateliers)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());