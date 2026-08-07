"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2Icon, ListChecksIcon } from "lucide-react";
import Link from "next/link";

export function PersonalSummaryCard({
  availCount,
  weekValidated,
}: {
  availCount: number;
  weekValidated: boolean;
}) {
  const items = [
    {
      key: "dispo",
      done: availCount > 0,
      label: "Renseignez vos disponibilités de la semaine",
      href: "/disponibilites",
      cta: "Renseigner",
    },
    {
      key: "valid",
      done: weekValidated,
      label: "Validez votre semaine pour la figer",
      href: "/disponibilites",
      cta: "Valider",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecksIcon className="size-5 text-accent" />
          Votre progression
        </CardTitle>
        <CardDescription>
          Les prochaines étapes pour rester synchronisé·e.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2Icon
                  className={`size-5 shrink-0 ${
                    it.done ? "text-success" : "text-muted-foreground"
                  }`}
                />
                <p className="text-sm">{it.label}</p>
              </div>
              {!it.done && (
                <Button
                  nativeButton={false}
                  render={<Link href={it.href} />}
                  size="sm"
                  variant="outline"
                >
                  {it.cta}
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Button
            nativeButton={false}
            render={<Link href="/ateliers/nouveau" />}
            variant="secondary"
            className="w-full justify-center"
          >
            Proposer un atelier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}