/* eslint-disable no-console */
// Script : ajoute N membres de test (fuseaux + dispo réalistes) dans "HashCode Team".
// Usage : npx tsx scripts/seed-members.ts --count=50
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Fuseaux horaires plausibles pour la cohorte (Afrique + diaspora).
const TIMEZONES = [
  "Africa/Porto-Novo",
  "Africa/Lagos",
  "Africa/Abidjan",
  "Africa/Accra",
  "Africa/Dakar",
  "Africa/Casablanca",
  "Africa/Algiers",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Kinshasa",
  "Africa/Kampala",
  "Africa/Addis_Ababa",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Toronto",
  "America/Montreal",
  "America/Los_Angeles",
];

const FIRST_NAMES = [
  "Awa", "Kofi", "Aminata", "Yacouba", "Fatou", "Ibrahim", "Mariam", "Sékou",
  "Aïcha", "Boubacar", "Nadia", "Issa", "Rokia", "Adama", "Salimata", "Moussa",
  "Clarisse", "Ousmane", "Estelle", "Jean", "Wade", "Diarra", "Gildas", "Sofia",
  "Melchior", "Awa", "Benoît", "Rachel", "Tunde", "Esi", "Kwame", "Finda",
  "Nathalie", "Omar", "Prudence", "Rahim", "Sana", "Tariq", "Yara", "Zainab",
  "Babacar", "Coumba", "Dido", "Elie", "Firdaus", "Georges", "Halima", "Idrissa",
  "Justine", "Kadiatou",
];

const LAST_NAMES = [
  "Mensah", "Traoré", "Dosso", "Keita", "Diop", "Ouattara", "Ndiaye", "Sow",
  "Kouassi", "Bamba", "Diallo", "Kone", "Fofana", "Sylla", "Camara", "Toure",
  "Zongo", "Barry", "Ouedraogo", "Adeyemi", "Okafor", "Nwachukwu", "Mensah",
  "Alaba", "Mokwena", "Ndiaye", "Sarr", "Gaye", "Fall", "Ba", "Cissé",
  "Sankara", "Zongo", "Kabore", "Kaboré", "Tapsoba", "Ilboudo", "Bambara",
  "Coulibaly", "Yao", "Aka", "Adjé", "Koffi", "Mensah", "Appiah", "Boateng",
  "Owusu", "Darko", "Mensah", "Agyeman",
];

const FIRST = Array.from(new Set(FIRST_NAMES));
const LAST = Array.from(new Set(LAST_NAMES));

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hhmm(h: number, m = 0) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// génère 2 à 4 créneaux hebdo par membre (jours variés, plages réalistes)
function genAvailabilities() {
  const n = 2 + Math.floor(Math.random() * 3); // 2..4
  const days = [1, 2, 3, 4, 5, 6]; // Lun-Sam
  const seen = new Set<number>();
  const out: { day: number; startTime: string; endTime: string }[] = [];
  for (let i = 0; i < n; i++) {
    const day = pick(days);
    if (seen.has(day)) {
      i--;
    } else {
      seen.add(day);
      const startH = day === 6 ? 9 + Math.floor(Math.random() * 3) : 8 + Math.floor(Math.random() * 6); // 8..18h
      const dur = 1 + Math.floor(Math.random() * 3); // 1-3h
      const endH = Math.min(startH + dur, 22);
      out.push({ day, startTime: hhmm(startH), endTime: hhmm(endH) });
    }
  }
  return out;
}

async function main() {
  const n = Math.max(1, Number(process.argv.find((a) => a.startsWith("--n="))?.split("=")[1] ?? 50));
  const group = await prisma.group.findFirst({ where: { name: "HashCode Team" }, select: { id: true } });
  if (!group) throw new Error("Groupe 'HashCode Team' introuvable");
  console.log(`Groupe cible : ${group.id}`);

  const existing = new Set((await prisma.user.findMany({ select: { email: true } })).map((u) => u.email));
  const created: string[] = [];
  const labels = LAST.map((l) => l);

  for (let i = 0; i < n; i++) {
    const email = `test.membre.${i + 1}@hashcode.demo`;
    if (existing.has(email)) continue;
    const firstname = pick(FIRST);
    const lastname = pick(LAST);
    const timezone = pick(TIMEZONES);

    const user = await prisma.user.create({
      data: {
        email,
        name: `${firstname} ${lastname}`,
        firstname,
        lastname,
        role: "member",
        timezone,
      },
    });
    created.push(user.id);
    existing.add(email);

    // adhésion au groupe
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: user.id, role: "member", hoursPerWeek: 0 },
    });

    // disponibilités générales du groupe
    const slots = genAvailabilities();
    await prisma.availability.createMany({
      data: slots.map((s) => ({
        userId: user.id,
        groupId: group.id,
        activityId: null,
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });
  }

  console.log(`Membres créés/associés : ${created.length}`);
  const total = await prisma.groupMember.count({ where: { groupId: group.id } });
  const emAvail = await prisma.availability.count({ where: { groupId: group.id } });
  console.log(`Membres dans le groupe : ${total}`);
  console.log(`Disponibilités liées au groupe : ${emAvail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());