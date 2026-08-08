import * as React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CheckCircle2, Zap, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogoSymbol } from "@/components/ui/logo";

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
    <main className="relative flex min-h-screen overflow-hidden">
      {}
      <div className="absolute inset-0 bg-grid opacity-40" aria-hidden="true" />

      {}
      <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-[128px] animate-pulse-glow" aria-hidden="true" />
      <div className="absolute bottom-1/4 -right-32 h-80 w-80 rounded-full bg-primary/10 blur-[100px] animate-pulse-glow" style={{ animationDelay: "1s" }} aria-hidden="true" />

      {}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-16 xl:px-24 relative z-10">
        <div className="animate-fade-in-up max-w-lg">
          {}
          <div className="relative mb-8 inline-flex">
            <div className="absolute -inset-4 rounded-2xl bg-primary/20 blur-xl" aria-hidden="true" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 text-white">
              <LogoSymbol size={28} />
            </div>
          </div>

          <h1 className="font-heading text-4xl font-semibold text-white tracking-tight mb-4">
            HashCode Sync
          </h1>
          <p className="text-lg text-[#A7B0C2] mb-8 leading-relaxed">
            La plateforme de coordination intelligente pour vos cohortes, ateliers et mentorats.
          </p>

          {}
          <div className="space-y-4">
            {[
              { icon: Users, text: "Synchronisez votre cohorte en quelques clics" },
              { icon: Zap, text: "Trouvez automatiquement le meilleur créneau" },
              { icon: CheckCircle2, text: "Organisez ateliers et mentorats sans effort" },
            ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="animate-fade-in-up flex items-center gap-3"
                  style={{ animationDelay: "0.2s" }}
                >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm text-[#A7B0C2]">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {}
      <div className="flex w-full items-center justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:px-8 relative z-10">
        <div className={cn("w-full max-w-[420px]", className)}>
          {}
          <div className="lg:hidden mb-8 flex flex-col items-center gap-4 animate-fade-in-up">
            <div className="relative">
              <div className="absolute -inset-3 rounded-xl bg-primary/20 blur-lg" aria-hidden="true" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 text-white">
                <LogoSymbol size={22} />
              </div>
            </div>
            <h1 className="font-heading text-xl font-semibold text-white">
              HashCode Sync
            </h1>
          </div>

          {}
          <div className="animate-scale-in">
            <Card className="glass glow border-white/[0.08] rounded-3xl">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-semibold text-white">
                  {title}
                </CardTitle>
                <CardDescription className="text-[#A7B0C2] text-base">
                  {description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {children}
              </CardContent>
            </Card>
          </div>

          {}
          <p className="mt-6 text-center text-xs text-[#A7B0C2]/60">
            HashCode Sync — Coordination intelligente
          </p>
          <p className="mt-2 text-center">
            <Link
              href="/"
              className="text-xs text-[#A7B0C2]/60 underline-offset-4 hover:text-[#A7B0C2] hover:underline transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
