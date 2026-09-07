import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Layout mentor — guard only, le shell parent gère la sidebar dédiée
export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  if (session.user.role !== "mentor" && session.user.role !== "admin") redirect("/forbidden");
  return <>{children}</>;
}
