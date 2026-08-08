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

  let body: { coverImage?: unknown; name?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Le nom du groupe est requis" }, { status: 400 });
    }
    updates.name = name;
  }
  if (typeof body.description === "string") {
    updates.description = body.description.trim() || null;
  }
  if (typeof body.coverImage === "string") {
    const coverImage = body.coverImage.trim() || null;
    if (coverImage !== null && !/^\/uploads\/[A-Za-z0-9._-]+$/.test(coverImage)) {
      return NextResponse.json({ error: "Chemin d'image invalide" }, { status: 400 });
    }
    if (group.coverImage && group.coverImage !== coverImage) {
      await removeUpload(group.coverImage);
    }
    updates.coverImage = coverImage;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification fournie" }, { status: 400 });
  }

  const updated = await prisma.group.update({
    where: { id },
    data: updates,
    select: { id: true, name: true, description: true, coverImage: true },
  });
  return NextResponse.json(updated);
}

// Supprimer le groupe.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const managerId = await requireManager(id);
  if (!managerId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({
    where: { id },
    select: { coverImage: true },
  });
  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  await prisma.group.delete({ where: { id } });

  if (group.coverImage) {
    await removeUpload(group.coverImage);
  }

  return NextResponse.json({ success: true });
}
