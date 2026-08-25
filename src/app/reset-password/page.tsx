"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { KeyRoundIcon, Loader2Icon } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
  }

  if (!token) {
    return (
      <AuthCard
        title="Lien invalide"
        description="Ce lien de réinitialisation est invalide ou incomplet."
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <KeyRoundIcon className="size-12 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Demandez un nouveau lien pour définir un nouveau mot de passe.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/forgot-password" />}
          className="w-full"
        >
          Demander un nouveau lien
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Nouveau mot de passe"
      description="Choisissez un nouveau mot de passe pour votre compte."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-[#A7B0C2] uppercase tracking-wider">
            Nouveau mot de passe
          </Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="8 caractères minimum"
            autoComplete="new-password"
            required
            minLength={8}
            className="h-[52px] pl-4 pr-12 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-[#A7B0C2]/40 focus:border-primary/50 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-sm font-medium text-[#A7B0C2] uppercase tracking-wider">
            Confirmer
          </Label>
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={setConfirm}
            placeholder="Répétez le mot de passe"
            autoComplete="new-password"
            required
            minLength={8}
            ariaInvalid={confirm.length > 0 && confirm !== password}
            className="h-[52px] pl-4 pr-12 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-[#A7B0C2]/40 focus:border-primary/50 focus:ring-primary/20 transition-all"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="h-[52px] w-full bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2Icon className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Réinitialiser
              <KeyRoundIcon className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#A7B0C2]">
        <Link
          href="/login"
          className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
        >
          Revenir à la connexion
        </Link>
      </p>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
