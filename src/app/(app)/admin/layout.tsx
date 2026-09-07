import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Layout admin — le shell parent (AppShell) gère déjà la sidebar dédiée admin
// Ce layout ne fait que le guard role, pas de doublon UI
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/forbidden");
  return <>{children}</>;
}
