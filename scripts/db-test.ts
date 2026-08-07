import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const g = await prisma.group.create({
    data: {
      name: "Test Include",
      description: "demo",
      createdBy: "5Mdzon1uLv3gzN5P0N9tubTnUlMlBF7a",
    },
    include: {
      creator: { select: { id: true, firstname: true, lastname: true, email: true } },
    },
  });
  console.log("created", g.id, g.name);
  const list = await prisma.group.findMany({
    include: {
      joinRequests: { where: { status: "pending" }, include: { user: true } },
    },
  });
  console.log("groups:", list.length);
}

main()
  .catch((e) => {
    console.error("ERR", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());