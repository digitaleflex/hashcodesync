"use client";

import { RocketIcon, ArrowRightIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Route } from "next";

export function OnboardingBanner({ hasAvailabilities, hasWorkshops }: { hasAvailabilities: boolean; hasWorkshops: boolean }) {
  if (hasAvailabilities && hasWorkshops) return null;

  const missing = [];
  if (!hasAvailabilities) missing.push({ href: "/disponibilites", label: "Renseigner mes disponibilités" });
  if (!hasWorkshops) missing.push({ href: "/ateliers/nouveau", label: "Proposer un atelier" });

  return (
    <Card className="border-accent/40 bg-accent/5 ring-1 ring-accent/30">
      <CardHeader className="flex flex-row items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <RocketIcon className="size-5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-lg">Bienvenue sur HashCode Sync</CardTitle>
          <CardDescription>
            Quelques étapes pour tirer le meilleur parti de la plateforme.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {missing.map((item) => (
            <li key={item.href} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-sm font-medium">{item.label}</p>
              <Button nativeButton={false} render={<Link href={item.href as Route} />} size="sm" variant="ghost" className="shrink-0">
                Y aller <ArrowRightIcon className="size-3.5 ml-1" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
