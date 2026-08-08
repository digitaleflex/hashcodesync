"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2Icon, AlertCircleIcon } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (error) {
    return (
      <AuthCard
        title="Vérification échouée"
        description="Le lien de vérification est invalide ou a expiré."
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircleIcon className="size-12 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Code : {error}
          </p>
        </div>
      <p className="text-center text-sm text-[#A7B0C2]">
        <Link href="/login" className="text-primary hover:underline">
          Revenir à la connexion
        </Link>
      </p>
    </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Vérifiez votre e-mail"
      description="Un lien de vérification a été envoyé à votre adresse."
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2Icon className="size-12 text-primary" />
        <p className="text-sm text-muted-foreground">
          Cliquez sur le lien dans l&apos;e-mail pour activer votre compte.
          Le lien expire dans 24 heures.
        </p>
      </div>
      <p className="text-center text-sm text-[#A7B0C2]">
        <Link href="/login" className="text-primary hover:underline">
          J&apos;ai vérifié, me connecter
        </Link>
      </p>
    </AuthCard>
  );
}
