import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Retourne l'id du manager/admin autorisé, ou null sinon.
export async function requireManager(groupId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  if (session.user.role === "admin") return session.user.id;
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (member?.role === "manager") return session.user.id;
  return null;
}