import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const pref = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  const defaults = {
    emailWorkshops: true,
    emailGroups: true,
    emailMentoring: true,
    emailSecurity: true,
    emailReminders: true,
  };

  return NextResponse.json({ preferences: pref ?? defaults });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: Record<string, boolean>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const allowed = ["emailWorkshops", "emailGroups", "emailMentoring", "emailSecurity", "emailReminders"];
  const data: Record<string, boolean> = {};
  for (const key of allowed) {
    if (key in body) {
      data[key] = Boolean(body[key]);
    }
  }

  const pref = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  return NextResponse.json({ preferences: pref });
}
