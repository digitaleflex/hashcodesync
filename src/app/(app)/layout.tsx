import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <AppShell />
      <main className="min-h-[calc(100vh-3.5rem)] pb-20 md:pb-0">{children}</main>
    </div>
  );
}