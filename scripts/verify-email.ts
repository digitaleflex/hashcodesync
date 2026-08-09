import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.update({
    where: { email: "eflexcloud@gmail.com" },
    data: { emailVerified: true },
    select: { id: true, email: true, emailVerified: true },
  });

  console.log("Utilisateur mis à jour :", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
