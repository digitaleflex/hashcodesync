const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function check(label, fn) {
  try {
    fn();
    console.log(`✅ ${label}`);
  } catch (err) {
    console.error(`❌ ${label}: ${err.message}`);
    process.exit(1);
  }
}

console.log("=== HashCode Sync - Pré-production checks ===\n");

// 1. Variables d'environnement
check("Variables d'environnement", () => {
  if (!fs.existsSync(".env")) throw new Error("Fichier .env manquant");

  const env = fs.readFileSync(".env", "utf-8");
  const required = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "NEXT_PUBLIC_BETTER_AUTH_URL",
    "CRON_SECRET",
  ];

  for (const key of required) {
    if (!env.includes(`${key}=`)) {
      throw new Error(`${key} manquant dans .env`);
    }
    const value = env
      .split("\n")
      .find((line) => line.startsWith(`${key}=`))
      ?.split("=")[1];
    if (!value || value.trim() === "") {
      throw new Error(`${key} est vide dans .env`);
    }
  }
});

// 2. Migrations Prisma
check("Migrations Prisma", () => {
  try {
    execSync("npx prisma migrate status", { stdio: "pipe" });
  } catch (err) {
    const msg = err.stdout?.toString() || err.message || "";
    if (msg.includes("no pending migrations") || msg.includes("No pending migrations")) {
      return;
    }
    throw new Error("Migrations non appliquées. Lancez: npx prisma migrate dev");
  }
});

// 3. TypeScript
check("TypeScript", () => {
  try {
    execSync("npx tsc --noEmit", { stdio: "ignore" });
  } catch {
    throw new Error("Erreurs TypeScript détectées");
  }
});

// 4. Build
check("Build Next.js", () => {
  try {
    execSync("npm run build", { stdio: "ignore" });
  } catch {
    throw new Error("Build échoué");
  }
});

console.log("\n=== ✅ Tous les checks sont passés ===");
