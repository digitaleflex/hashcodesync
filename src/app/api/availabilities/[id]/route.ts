import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.availability.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Disponibilité introuvable" },
      { status: 404 }
    );
  }

  await prisma.availability.delete({ where: { id } });
  return NextResponse.json({ success: true });
}