import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildOwnedWhere,
  findOwnedUnavailability,
} from "../src/lib/unavailability-guard";

// Prisma « simulé » : findFirst répond uniquement si la période appartient
// à userId, reproduisant le comportement de la base (filtre WHERE id+userId).
function makeFakePrisma(ownerOf: Record<string, string>) {
  const calls: { id?: string; userId?: string }[] = [];
  return {
    unavailability: {
      findFirst: async (args: unknown) => {
        const where = (args as { where: { id: string; userId: string } }).where;
        calls.push(where);
        if (ownerOf[where.id] === where.userId) return { id: where.id };
        return null;
      },
    },
    getCalls: () => calls,
  };
}

test("buildOwnedWhere: filtre toujours par id ET userId", () => {
  assert.deepEqual(buildOwnedWhere("abc", "user-1"), {
    id: "abc",
    userId: "user-1",
  });
});

test("findOwnedUnavailability: une période d'autrui n'est jamais renvoyée", async () => {
  const fake = makeFakePrisma({ abc: "owner-999" }); // abc appartient à un autre
  const result = await findOwnedUnavailability(fake as never, "abc", "user-1");
  assert.equal(result, null, "ne doit pas exposer la période d'un autre utilisateur");
  assert.deepEqual(fake.getCalls()[0], { id: "abc", userId: "user-1" });
});

test("findOwnedUnavailability: la propre période de l'utilisateur est renvoyée", async () => {
  const fake = makeFakePrisma({ abc: "user-1" });
  const result = await findOwnedUnavailability(fake as never, "abc", "user-1");
  assert.deepEqual(result, { id: "abc" });
});