import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { convertToReference } from "../src/lib/timezone";
import { computeScheduling } from "../src/lib/scheduling";
import { computeMassHours } from "../src/lib/masse-horaire";
import { presenceProbability } from "../src/lib/probability";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DAY = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

function show(label: string, s: ReturnType<typeof computeScheduling>, total: number) {
  console.log(`\n--- ${label} ---`);
  s.recommendation.slice(0, 6).forEach((r, i) => {
    console.log(`  #${i + 1} ${DAY[r.day]} ${r.startTime}-${r.endTime}  → attente ${r.available}/${total} (${r.percent}%)`);
  });
}

async function main() {
  const group = await prisma.group.findFirst({ where: { name: "HashCode Team" } });
  if (!group) throw new Error("Groupe introuvable");

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

  const total = members.length;
  const windowHours = 2;

  const byId = new Map(members.map((m) => [m.user.id, m]));
  const attendanceRows = await prisma.attendance.findMany({
    where: { userId: { in: Array.from(byId.keys()) } },
    select: { userId: true, status: true },
  });
  const history = new Map<string, { present: number; absent: number }>();
  for (const a of attendanceRows) {
    const h = history.get(a.userId) ?? { present: 0, absent: 0 };
    if (a.status === "present") h.present++;
    else h.absent++;
    history.set(a.userId, h);
  }

  // RAW : aucun poids
  const rawRows = members.flatMap((m) =>
    m.user.availabilities.map((a) => ({
      day: a.day, startTime: a.startTime, endTime: a.endTime, userTz: m.user.timezone,
    }))
  );
  const raw = computeScheduling(
    convertToReference(rawRows).map((a) => ({ day: a.day, startMin: a.startMin, endMin: a.endMin })),
    total, windowHours
  );
  show("RAW (comptage brut)", raw, total);

  // MASS : pondéré par probabilité issue de la masse horaire uniquement
  const massRows = members.flatMap((m) => {
    const mass = computeMassHours(m.user.availabilities);
    const w = presenceProbability({ present: 0, absent: 0 }, mass);
    return m.user.availabilities.map((a) => ({
      day: a.day, startTime: a.startTime, endTime: a.endTime, userTz: m.user.timezone, weight: w,
    }));
  });
  const mass = computeScheduling(
    convertToReference(massRows).map((a) => ({ day: a.day, startMin: a.startMin, endMin: a.endMin, weight: a.weight })),
    total, windowHours
  );
  show("MASS (pondéré par masse horaire)", mass, total);

  // BAYES : masse + historique sai simulé
  const bayesRows = members.flatMap((m) => {
    const mass = computeMassHours(m.user.availabilities);
    const w = presenceProbability(history.get(m.user.id) ?? { present: 0, absent: 0 }, mass);
    return m.user.availabilities.map((a) => ({
      day: a.day, startTime: a.startTime, endTime: a.endTime, userTz: m.user.timezone, weight: w,
    }));
  });
  const bayes = computeScheduling(
    convertToReference(bayesRows).map((a) => ({ day: a.day, startMin: a.startMin, endMin: a.endMin, weight: a.weight })),
    total, windowHours
  );
  show("BAYES (masse + historique)", bayes, total);

  // affichage heatmap lissée vs brute (Mercedi 10:00 et 14:00)
  const brute = raw.heatmap.filter((h) => h.day === 2 && h.count > 0);
  const lisse = (raw.heatmapSmoothed ?? []).filter((h) => h.day === 2 && h.count > 0);
  console.log("\nHeatmap Mercredi — brut vs lissé (KDE) :");
  brute.forEach((b) => {
    const s = lisse.find((c) => c.hour === b.hour);
    console.log(`  ${String(b.hour).padStart(2, "0")}:00 → brut ${b.count} | lissé ${s?.count ?? "-"}`);
  });
}

// helper pour aller cherche un bout d'historique si la table est vide : génère un
// profil d'absentéisme réaliste (20% des membres absents à ~30% de leurs dispo).
async function mainSeedHistory() {
  const group = await prisma.group.findFirst({ where: { name: "HashCode Team" } });
  if (!group) return;
  const members = await prisma.groupMember.findMany({
    where: { groupId: group.id },
    select: { userId: true },
  });
  const hasAny = await prisma.attendance.count();
  if (hasAny > 0) return;
  const workshops = await prisma.workshop.findMany({ select: { id: true }, take: 8 });
  if (workshops.length === 0) return;
  for (const m of members) {
    const absentee = Math.random() < 0.25;
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const ws = workshops[i % workshops.length];
      const present = !absentee ? Math.random() > 0.1 : Math.random() > 0.65;
      await prisma.attendance.upsert({
        where: { workshopId_userId: { workshopId: ws.id, userId: m.userId } },
        create: { workshopId: ws.id, userId: m.userId, status: present ? "present" : "absent" },
        update: {},
      });
    }
  }
  console.log("Historique de présence simulé.");
}

const runHistory = process.argv.includes("--history");
(runHistory ? mainSeedHistory().then(() => main()) : main())
  .catch((e) => { console.error((e as Error).message); process.exit(1); })
  .finally(() => prisma.$disconnect());