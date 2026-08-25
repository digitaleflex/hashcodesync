// Vérifie que la configuration minimale est présente avant build/déploiement.
// Utilisation : npm run preflight
const REQUIRED = [
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
];

const OPTIONAL = [
  "NEXT_PUBLIC_BETTER_AUTH_URL",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "NEXT_PUBLIC_APP_URL",
];

function main() {
  let fail = false;

  console.log("— Préflight HashCode Sync —\n");

  for (const key of REQUIRED) {
    const value = process.env[key];
    if (!value) {
      console.error(`  ✗ ${key} : manquant`);
      fail = true;
    } else if (key.endsWith("SECRET") && value.length < 16) {
      console.error(`  ✗ ${key} : trop court (< 16 caractères)`);
      fail = true;
    } else {
      console.log(`  ✓ ${key}`);
    }
  }

  for (const key of OPTIONAL) {
    if (!process.env[key]) {
      console.warn(`  ! ${key} : non défini (fallback éventuel utilisé)`);
    } else {
      console.log(`  ✓ ${key}`);
    }
  }

  console.log("");
  if (fail) {
    console.error("Préflight KO — corrigez les variables manquantes (voir .env.example).");
    process.exit(1);
  }
  console.log("Préflight OK ✓");
}

main();
