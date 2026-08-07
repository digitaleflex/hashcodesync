import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removeUpload } from "@/lib/uploads";
import { requireManager } from "../_shared";

type Ctx = { params: Promise<{ id: string }> };

// Ajouter une activité au groupe.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const managerId = await requireManager(id);
  if (!managerId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { name?: unknown; type?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "atelier");
  const description = String(body.description ?? "").trim() || null;
  const validTypes = ["atelier", "conference", "lab", "autre"];
  if (!name) {
    return NextResponse.json({ error: "Le nom de l'activité est requis" }, { status: 400 });
  }
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Type d'activité invalide" }, { status: 400 });
  }

  const activity = await prisma.groupActivity.create({
    data: { groupId: id, name, type, description },
  });
  return NextResponse.json(activity, { status: 201 });
}

// Mise à jour de l'image de couverture (PATCH /api/admin/groups/:id  { coverImage: "/uploads/x.png" }).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const managerId = await requireManager(id);
  if (!managerId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { coverImage?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const coverImage = typeof body.coverImage === "string" ? body.coverImage.trim() : null;
  if (coverImage !== null && !coverImage.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Chemin d'image invalide" }, { status: 400 });
  }

  const current = await prisma.group.findUnique({ where: { id }, select: { coverImage: true } });
  if (!current) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }
  const updated = await prisma.group.update({
    where: { id },
    data: { coverImage },
    select: { id: true, coverImage: true },
  });
  if (current.coverImage && current.coverImage !== coverImage) {
    await removeUpload(current.coverImage);
  }
  return NextResponse.json(updated);
}
