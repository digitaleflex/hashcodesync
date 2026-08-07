"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, MailIcon, ArrowLeftIcon } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const requestReset = async () => {
    if (!email.includes("@")) {
      toast.error("Entrez une adresse email valide");
      return;
    }
    setSubmitting(true);
    try {
      await authClient.requestPasswordReset({ email });
      setSent(true);
    } catch {
      toast.error("Échec de la demande de réinitialisation");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-accent/10">
          <MailIcon className="size-6 text-accent" />
        </div>
        <h1 className="font-heading text-2xl font-semibold">Email envoyé</h1>
        <p className="text-sm text-muted-foreground">
          Si un compte existe pour <span className="font-medium">{email}</span>,
          vous recevrez un lien pour réinitialiser votre mot de passe. En
          développement, le lien est affiché dans la console du serveur.
        </p>
        <Button nativeButton={false} render={<Link href="/login" />} variant="outline">
          <ArrowLeftIcon className="size-4" /> Retour à la connexion
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 px-4">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-semibold">
          Mot de passe oublié
        </h1>
        <p className="text-sm text-muted-foreground">
          Saisissez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>
      <div className="w-full space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
          />
        </div>
        <Button className="w-full" onClick={requestReset} disabled={submitting}>
          {submitting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <MailIcon className="size-4" />
          )}
          Envoyer le lien
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="text-accent hover:underline">
          Revenir à la connexion
        </Link>
      </p>
    </div>
  );
}