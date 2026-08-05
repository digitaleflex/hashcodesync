import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className={cn("w-full max-w-md", className)}>
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent font-heading text-2xl font-bold text-white">
            H
          </div>
          <h1 className="font-heading text-2xl font-semibold text-accent">
            HashCode Sync
          </h1>
          <p className="text-sm text-muted-foreground">
            Scheduling &amp; Cohort Coordination
          </p>
        </div>
        <Card className="bg-secondary/60">
          <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Identifie. Développe. Impacte. — HashCode Community
        </p>
        <p className="mt-2 text-center">
          <Link href="/" className="text-xs text-muted-foreground underline-offset-4 hover:text-accent hover:underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
