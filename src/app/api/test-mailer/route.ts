import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { testMailer } from "@/lib/mailer";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const to = req.nextUrl.searchParams.get("to") ?? session.user.email;
  const result = await testMailer(to);
  return NextResponse.json(result);
}
