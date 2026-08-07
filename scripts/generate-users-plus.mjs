// Génère +100 utilisateurs réalistes avec une grande variété de disponibilités
// pour couvrir toutes les hypothèses. Usage: node scripts/generate-users-plus.mjs
import { execFileSync } from "node:child_process";

const BASE = "http://localhost:3000";
const PASSWORD = "password123";

const psql = (sql) =>
  execFileSync(
    "docker",
    ["exec", "-i", "hashcode-postgres", "psql", "-U", "hashcode", "-d", "hashcodesyncdb", "-q"],
    { input: sql, encoding: "utf8" }
  );
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let seed = 20260805;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const ri = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const FIRST = [
  "Lea","Hugo","Chloe","Nathan","Emma","Lucas","Jade","Louis","Manon","Gabriel",
  "Camille","Theo","Sarah","Arthur","Ines","Romain","Zoe","Noah","Alice","Ethan",
  "Lina","Maxime","Clara","Jules","Rose","Antoine","Elsa","Nina","Thiago","Luis",
  "Ana","Sophie","Julien","Mathis","Adam","Eva","Marius","Lou","Nour","Oscar",
  "Rayan","Sofia","Diego","Aya","Yanis","Inaya","Mahe","Aaron","Simone","Iris",
  "Louane","Camelia","Dylan","Maelys","Gabin","Emie","Lyam","Nael","Farah",
  "Selma","Louna","Titouan","Sohan","Maeva","Quentin","Bastien","Noe","Solene",
  "Romeo","Thibault","Gabrielle","Sam","Valentin","Anouck","Thalia","Lyna",
  "Chayma","Aden","Elyan","Julian","Pia","Capucine","Nadia","Archie","Melina",
  "Yanis","Ilyan","Swan","Salome","Mahaut","Angele","Tessa","Vera","Agathe",
  "Maia","Jasmine","Oceane","Louise","Victoria","Natalie","Mathilde",
];
const LAST = [
  "Martin","Bernard","Dubois","Petit","Robert","Richard","Durand","Moreau",
  "Fournier","Girard","Lambert","Rousseau","Fontaine","Clement","Lefebvre",
  "Colin","Marchal","Renard","Benali","Vasseur","Guerin","Perrin","Barbier",
  "Vigneron","Sergent","Blanc","Noel","Chevalier","Lombard","Breton","Garnier",
  "Vidal","Joly","Dumont","Henry","Rey","Garcia","Lopez","Silva","Meunier",
  "Denis","Faure","Toussaint","Marchand","Maillet","Deschamps","Berger","Aubert",
  "Jacquet","Leclerc","Caron","Clerc","Lacroix","Maillard","Gauthier","Collet",
  "Brun","Bigot","Perez","Nguyen","Schmidt","Leroux","Dupuy","Lemaire","Bouvier",
];
const DOMAINS = ["gmail.com","free.fr","orange.fr","yahoo.fr","outlook.com","laposte.net","hotmail.fr"];

const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");

const DAYS7 = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [0, 1, 2, 3, 4];
const WEEKEND = [5, 6];

const hhmm = (h, m = 0) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// ---- Stratégies de profil (chaque retour = liste [jour, start, end]) ----
function strategyNone() {
  return [];
}
function strategyWeekdayMorning() {
  const days = ri(2, 5) === 5 ? WEEKDAYS : WEEKDAYS.slice(0, ri(3, 5));
  return days.map((d) => [d, hhmm(ri(7, 9)), hhmm(ri(11, 13))]);
}
function strategyWeekdayAfternoon() {
  const days = ri(2, 5) === 5 ? WEEKDAYS : WEEKDAYS.slice(0, ri(3, 5));
  return days.map((d) => [d, hhmm(ri(13, 15)), hhmm(ri(17, 19))]);
}
function strategyFullWorkday() {
  const days = ri(2, 5) === 5 ? WEEKDAYS : WEEKDAYS.slice(0, ri(3, 5));
  return days.map((d) => [d, hhmm(ri(8, 9)), hhmm(ri(17, 18))]);
}
function strategyEvening() {
  const days = ri(2, 5) === 5 ? WEEKDAYS : WEEKDAYS.slice(0, ri(3, 5));
  return days.map((d) => [d, hhmm(ri(18, 19)), hhmm(ri(21, 22))]);
}
function strategyWeekendOnly() {
  return WEEKEND.map((d) => [d, hhmm(ri(9, 11)), hhmm(ri(16, 18))]);
}
function strategySingleSlot() {
  return [[pick(DAYS7), hhmm(ri(8, 18)), hhmm(ri(9, 19))]];
}
function strategySplitDay() {
  const days = ri(2, 5) === 5 ? WEEKDAYS : WEEKDAYS.slice(0, ri(2, 4));
  const slots = [];
  for (const d of days) {
    slots.push([d, hhmm(ri(9, 10)), hhmm(ri(11, 12))]);
    slots.push([d, hhmm(ri(14, 15)), hhmm(ri(16, 17))]);
  }
  return slots;
}
function strategyLunchBreak() {
  return WEEKDAYS.slice(0, ri(3, 5)).map((d) => [d, hhmm(12, 0), hhmm(14, 0)]);
}
function strategyEarlyBird() {
  const days = ri(2, 5) === 5 ? WEEKDAYS : WEEKDAYS.slice(0, ri(3, 5));
  return days.map((d) => [d, hhmm(6, 30), hhmm(9, 0)]);
}
function strategyLateNight() {
  const days = ri(2, 5) === 5 ? WEEKDAYS : WEEKDAYS.slice(0, ri(2, 4));
  return days.map((d) => [d, hhmm(20, 30), hhmm(23, 0)]);
}
function strategyVeryBroad() {
  return DAYS7.map((d) => [d, hhmm(7, 0), hhmm(22, 0)]);
}
function strategyHalfDayAM() {
  return WEEKDAYS.slice(0, ri(3, 5)).map((d) => [d, hhmm(8, 0), hhmm(12, 0)]);
}
function strategyHalfDayPM() {
  return WEEKDAYS.slice(0, ri(3, 5)).map((d) => [d, hhmm(13, 0), hhmm(17, 0)]);
}
function strategyLongContinuous() {
  const days = ri(2, 5) === 5 ? WEEKDAYS : WEEKDAYS.slice(0, ri(2, 4));
  return days.map((d) => [d, hhmm(6, 0), hhmm(20, 0)]);
}
function strategyMinutesOdd() {
  const days = ri(2, 5) === 5 ? WEEKDAYS : WEEKDAYS.slice(0, ri(3, 5));
  return days.map((d) => [d, hhmm(ri(8, 10), ri(0, 45)), hhmm(ri(11, 13), ri(0, 45))]);
}
function strategyWeekendLong() {
  return WEEKEND.map((d) => [d, hhmm(9, 0), hhmm(21, 0)]);
}
function strategyOvernight() {
  return [[pick(WEEKDAYS), hhmm(22, 0), hhmm(1, 0)]];
}
function strategyBackToBack() {
  return WEEKDAYS.slice(0, 5).flatMap((d) => [
    [d, hhmm(8, 0), hhmm(10, 0)],
    [d, hhmm(10, 0), hhmm(12, 0)],
  ]);
}
function strategySparse() {
  return [[pick(DAYS7), hhmm(ri(9, 11)), hhmm(ri(11, 13))]];
}
function strategyMentor() {
  const days = WEEKDAYS.slice(0, ri(3, 5));
  return days.map((d) => [d, hhmm(ri(9, 10)), hhmm(ri(16, 18))]);
}

const STRATEGIES = [
  strategyNone, strategyNone, strategyNone, strategyNone,
  strategyWeekdayMorning, strategyWeekdayMorning,
  strategyWeekdayAfternoon, strategyWeekdayAfternoon,
  strategyFullWorkday, strategyFullWorkday, strategyFullWorkday,
  strategyEvening, strategyEvening,
  strategyWeekendOnly, strategyWeekendOnly,
  strategySingleSlot, strategySplitDay, strategyLunchBreak,
  strategyEarlyBird, strategyLateNight, strategyVeryBroad,
  strategyHalfDayAM, strategyHalfDayPM, strategyLongContinuous,
  strategyMinutesOdd, strategyWeekendLong, strategyOvernight,
  strategyBackToBack, strategySparse, strategyMentor,
];

const usedEmails = new Set();
function makeUser(i) {
  let fn = pick(FIRST);
  let ln = pick(LAST);
  let email;
  do {
    const d = pick(DOMAINS);
    email = `${norm(fn)}.${norm(ln)}${ri(0, 99)}@${d}`;
  } while (usedEmails.has(email));
  usedEmails.add(email);
  const strat = STRATEGIES[i % STRATEGIES.length];
  return { fn, ln, email, role: "member", avail: strat() };
}

const COUNT = 100;
const users = Array.from({ length: COUNT }, (_, i) => makeUser(i));

let ok = 0;
for (const u of users) {
  const signup = async () => {
    const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({
        name: `${u.fn} ${u.ln}`,
        firstname: u.fn,
        lastname: u.ln,
        email: u.email,
        password: PASSWORD,
      }),
    });
    return { res, json: await res.json().catch(() => ({})) };
  };

  let { res, json } = await signup();
  let attempts = 0;
  while (res.status === 403 && attempts < 8) {
    await sleep(1200 + attempts * 900);
    ({ res, json } = await signup());
    attempts++;
  }
  const id = json.user?.id;
  if (res.status !== 200 || !id) {
    console.log(`SKIP (${res.status}) ${u.email}`);
    continue;
  }
  ok++;

  const sql = [];
  u.avail.forEach((slot, k) => {
    const [day, start, end] = slot;
    sql.push(
      `INSERT INTO "Availability" (id,"userId",day,"startTime","endTime","createdAt","updatedAt") VALUES ('pg_${ok}_${k}', '${id}', ${day}, '${start}', '${end}', now(), now());`
    );
  });
  if (sql.length) psql(sql.join("\n"));
  if (ok % 20 === 0) console.log(`... ${ok}/${COUNT}`);
  await sleep(220);
}

const total = psql(`SELECT count(*) FROM "user";`).trim();
const abs = psql(`SELECT count(*) FROM "Availability";`).trim();
console.log(`\n=== créés: ${ok} | total users=${total} | total avail=${abs} ===`);
