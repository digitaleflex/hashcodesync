import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#FCFCFD]">
      <AppShell>{children}</AppShell>
    </div>
  );
}