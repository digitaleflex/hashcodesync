import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = (await req.json()) as {
      firstname?: string;
      lastname?: string;
      timezone?: string;
    };
    const firstname = String(body.firstname ?? "").trim();
    const lastname = String(body.lastname ?? "").trim();

    if (!firstname || !lastname) {
      return NextResponse.json(
        { error: "Prénom et nom sont requis" },
        { status: 400 }
      );
    }

    const data: Record<string, string> = {
      firstname,
      lastname,
      name: `${firstname} ${lastname}`,
    };
    if (body.timezone) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: body.timezone });
        data.timezone = body.timezone;
      } catch {
        return NextResponse.json(
          { error: "Fuseau horaire invalide" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        firstname: true,
        lastname: true,
        role: true,
        timezone: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/user", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}