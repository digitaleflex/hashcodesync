"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, KeyRoundIcon } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!token) {
      toast.error("Lien de réinitialisation invalide");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        toast.error(error.message ?? "Lien invalide ou expiré");
        return;
      }
      toast.success("Mot de passe réinitialisé, connectez-vous !");
      router.push("/login");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 px-4">
      <div className="space-y-1 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent/10">
          <KeyRoundIcon className="size-6 text-accent" />
        </div>
        <h1 className="font-heading text-2xl font-semibold">
          Nouveau mot de passe
        </h1>
        <p className="text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>
      </div>
      <div className="w-full space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="8 caractères minimum"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmer</Label>
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={setConfirm}
            placeholder="Répétez le mot de passe"
          />
        </div>
        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <KeyRoundIcon className="size-4" />
          )}
          Réinitialiser
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