import type { PrismaClient } from "@/generated/prisma/client";

type PrismaLike = Pick<PrismaClient, "unavailability">;
type FindFirstArgs = Parameters<PrismaClient["unavailability"]["findFirst"]>[0];

// Guard d'ownership réutilisé par les handlers d'indisponibilité : un
// utilisateur ne peut lire/modifier/supprimer que SES périodes. Retourne
// l'enregistrement si la période lui appartient, sinon null.
export function buildOwnedWhere(id: string, userId: string) {
  return { id, userId };
}

export async function findOwnedUnavailability(
  prisma: PrismaLike,
  id: string,
  userId: string
) {
  return prisma.unavailability.findFirst({
    where: buildOwnedWhere(id, userId),
  } as FindFirstArgs);
}