import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import "dotenv/config";
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
(async () => {
  const w = await p.weeklyValidation.findMany();
  console.log("weekly_validation rows:", w.length);
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
