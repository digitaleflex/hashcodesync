// Seed de 30 utilisateurs réalistes (FR) pour tests d'isolation & volumétrie.
// Usage: node scripts/seed-users.mjs   (serveur dev démarré sur http://localhost:3000)
import { execFileSync } from "node:child_process";

const BASE = "http://localhost:3000";
const PASSWORD = "password123";
// 0=Lundi ... 6=Dimanche ; disponibilités = [ [jour, "HH:mm", "HH:mm"], ... ]
const users = [
  { f: "Lea", l: "Moreau", e: "lea.moreau@gmail.com", r: "member",
    a: [[0,"08:00","12:00"],[0,"13:00","17:00"],[1,"08:00","12:00"],[1,"13:00","17:00"],[2,"08:00","12:00"],[2,"13:00","17:00"],[3,"08:00","12:00"],[3,"13:00","17:00"],[4,"08:00","12:00"],[4,"13:00","17:00"]] },
  { f: "Hugo", l: "Dubois", e: "hugo.dubois@free.fr", r: "member",
    a: [[0,"18:00","21:00"],[2,"18:00","21:00"],[4,"18:00","21:00"]] },
  { f: "Chloe", l: "Martin", e: "chloe.martin@outlook.com", r: "member",
    a: [[1,"09:00","12:00"],[3,"09:00","12:00"]] },
  { f: "Nathan", l: "Bernard", e: "nathan.bernard@gmail.com", r: "member",
    a: [[0,"09:00","18:00"],[1,"09:00","18:00"],[2,"09:00","18:00"],[3,"09:00","18:00"],[4,"09:00","18:00"]] },
  { f: "Emma", l: "Petit", e: "emma.petit@yahoo.fr", r: "member",
    a: [[5,"10:00","16:00"],[6,"10:00","16:00"]] },
  { f: "Lucas", l: "Robert", e: "lucas.robert@orange.fr", r: "member",
    a: [[0,"10:00","14:00"]] },
  { f: "Jade", l: "Richard", e: "jade.richard@gmail.com", r: "member",
    a: [[0,"07:00","09:00"],[1,"07:00","09:00"],[2,"07:00","09:00"],[3,"07:00","09:00"],[4,"07:00","09:00"]] },
  { f: "Louis", l: "Durand", e: "louis.durand@free.fr", r: "member",
    a: [[0,"12:00","14:00"],[1,"12:00","14:00"],[2,"12:00","14:00"],[3,"12:00","14:00"],[4,"12:00","14:00"]] },
  { f: "Manon", l: "Leroy", e: "manon.leroy@gmail.com", r: "member",
    a: [[0,"09:00","21:00"],[1,"09:00","21:00"],[2,"09:00","21:00"],[3,"09:00","21:00"],[4,"09:00","21:00"],[5,"09:00","21:00"],[6,"09:00","21:00"]] },
  { f: "Gabriel", l: "Moreau", e: "gabriel.moreau@laposte.net", r: "member",
    a: [] },
  { f: "Camille", l: "Fournier", e: "camille.fournier@gmail.com", r: "member",
    a: [[0,"14:00","18:00"],[1,"14:00","18:00"],[2,"14:00","18:00"],[3,"14:00","18:00"],[4,"14:00","18:00"]] },
  { f: "Theo", l: "Girard", e: "theo.girard@free.fr", r: "member",
    a: [[2,"15:00","23:00"],[3,"15:00","23:00"],[4,"15:00","23:00"],[5,"15:00","23:00"],[6,"15:00","23:00"]] },
  { f: "Sarah", l: "Lambert", e: "sarah.lambert@outlook.com", r: "member",
    a: [[0,"08:30","11:30"],[1,"08:30","11:30"],[2,"08:30","11:30"],[3,"08:30","11:30"],[4,"08:30","11:30"]] },
  { f: "Arthur", l: "Rousseau", e: "arthur.rousseau@gmail.com", r: "member",
    a: [[1,"17:00","20:00"],[3,"17:00","20:00"]] },
  { f: "Ines", l: "Fontaine", e: "ines.fontaine@yahoo.fr", r: "member",
    a: [[0,"09:00","13:00"],[1,"09:00","13:00"],[2,"09:00","13:00"]] },
  { f: "Romain", l: "Chevalier", e: "romain.chevalier@gmail.com", r: "member",
    a: [[4,"09:00","12:00"],[5,"09:00","12:00"],[6,"09:00","12:00"]] },
  { f: "Zoe", l: "Clement", e: "zoe.clement@orange.fr", r: "member",
    a: [[0,"16:00","20:00"],[1,"16:00","20:00"],[2,"16:00","20:00"],[3,"16:00","20:00"],[4,"16:00","20:00"]] },
  { f: "Noah", l: "Lefebvre", e: "noah.lefebvre@free.fr", r: "member",
    a: [[5,"08:00","12:00"],[6,"08:00","12:00"],[0,"19:00","22:00"],[1,"19:00","22:00"],[2,"19:00","22:00"],[3,"19:00","22:00"],[4,"19:00","22:00"]] },
  { f: "Alice", l: "Henry", e: "alice.henry@gmail.com", r: "member",
    a: [[0,"10:00","12:00"],[0,"14:00","16:00"],[1,"10:00","12:00"],[1,"14:00","16:00"],[2,"10:00","12:00"],[2,"14:00","16:00"],[3,"10:00","12:00"],[3,"14:00","16:00"],[4,"10:00","12:00"],[4,"14:00","16:00"]] },
  { f: "Ethan", l: "Boyer", e: "ethan.boyer@outlook.com", r: "member",
    a: [[0,"09:00","17:00"]] },
  { f: "Lina", l: "Bonnet", e: "lina.bonnet@laposte.net", r: "member",
    a: [[1,"11:00","19:00"],[2,"11:00","19:00"],[3,"11:00","19:00"],[4,"11:00","19:00"],[5,"11:00","19:00"]] },
  { f: "Maxime", l: "Vasseur", e: "maxime.vasseur@gmail.com", r: "member",
    a: [] },
  { f: "Clara", l: "Guerin", e: "clara.guerin@free.fr", r: "member",
    a: [[0,"06:00","08:00"],[1,"06:00","08:00"],[2,"06:00","08:00"],[3,"06:00","08:00"],[4,"06:00","08:00"]] },
  { f: "Jules", l: "Perrin", e: "jules.perrin@gmail.com", r: "member",
    a: [[0,"13:00","17:00"],[1,"13:00","17:00"],[2,"13:00","17:00"],[3,"13:00","17:00"],[4,"13:00","17:00"]] },
  { f: "Rose", l: "Barbier", e: "rose.barbier@yahoo.fr", r: "member",
    a: [[6,"14:00","18:00"]] },
  // ---- Mentors ----
  { f: "Antoine", l: "Lefevre", e: "antoine.lefevre@gmail.com", r: "mentor",
    a: [[0,"10:00","16:00"],[2,"10:00","16:00"],[4,"10:00","16:00"]] },
  { f: "Elsa", l: "Colin", e: "elsa.colin@outlook.com", r: "mentor",
    a: [[1,"09:00","12:00"],[3,"09:00","12:00"]] },
  { f: "Julien", l: "Marchal", e: "julien.marchal@free.fr", r: "mentor",
    a: [[0,"08:00","12:00"],[1,"08:00","12:00"],[2,"08:00","12:00"],[3,"08:00","12:00"],[4,"08:00","12:00"]] },
  { f: "Charlotte", l: "Renard", e: "charlotte.renard@gmail.com", r: "mentor",
    a: [[2,"14:00","20:00"],[3,"14:00","20:00"],[4,"14:00","20:00"],[5,"14:00","20:00"]] },
  // ---- Admin ----
  { f: "Karim", l: "Benali", e: "karim.benali@gmail.com", r: "admin",
    a: [[0,"09:00","18:00"],[1,"09:00","18:00"],[2,"09:00","18:00"],[3,"09:00","18:00"],[4,"09:00","18:00"]] },
];

const psql = (sql) =>
  execFileSync(
    "docker",
    ["exec", "-i", "hashcode-postgres", "psql", "-U", "hashcode", "-d", "hashcodesyncdb", "-q"],
    { input: sql, encoding: "utf8" }
  );

let created = 0;
for (const u of users) {
  const slug = u.e.replace(/[^a-z0-9]/gi, "_");
  const signup = async () => {
    const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({
        name: `${u.f} ${u.l}`,
        firstname: u.f,
        lastname: u.l,
        email: u.e,
        password: PASSWORD,
      }),
    });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  };

  let { res, json } = await signup();
  // Retry lent sur rate-limit / erreurs transitoires.
  let attempts = 0;
  while (res.status === 403 && attempts < 5) {
    await sleep(1500 + attempts * 1000);
    ({ res, json } = await signup());
    attempts++;
  }
  const id = json.user?.id || null;

  if (res.status !== 200 || !id) {
    console.log(`SKIP (${res.status}) ${u.e} -> ${JSON.stringify(json).slice(0, 90)}`);
    continue;
  }
  created++;

  const sql = [];
  if (u.r !== "member") {
    sql.push(`UPDATE "user" SET role='${u.r}' WHERE id='${id}';`);
  }
  u.a.forEach((slot, i) => {
    const [day, start, end] = slot;
    sql.push(
      `INSERT INTO "Availability" (id,"userId",day,"startTime","endTime","createdAt","updatedAt") VALUES ('av_${slug}_${i}', '${id}', ${day}, '${start}', '${end}', now(), now());`
    );
  });
  if (sql.length) psql(sql.join("\n"));

  console.log(`${res.status} ${u.e} role=${u.r} abs=${u.a.length}`);
  await sleep(350);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const total = psql(`SELECT count(*) FROM "user";`).trim();
const roles = psql(`SELECT role, count(*) FROM "user" GROUP BY role ORDER BY role;`).replace(/\s+/g, " ").trim();
const abs = psql(`SELECT count(*) FROM "Availability";`).trim();
console.log(`\n=== TOTAL users=${total} | avail=${abs} ===`);
console.log(roles);