"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2Icon } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "Impossible d'envoyer le lien");
      return;
    }

    setSent(true);
    toast.success("Si un compte existe, un e-mail a été envoyé");
  }

  if (sent) {
    return (
      <AuthCard
        title="E-mail envoyé"
        description="Vérifiez votre boîte de réception et vos spams."
      >
        <div className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>
            Si l&apos;adresse <span className="font-medium text-foreground">{email}</span> est
            associée à un compte, vous recevrez un lien de réinitialisation.
          </p>
          <p>Le lien expire dans 1 heure.</p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
        >
          Envoyer un autre lien
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Revenir à la connexion
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Entrez votre e-mail pour recevoir un lien de réinitialisation."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-muted-foreground">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[52px] pl-10 pr-4 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-[52px] w-full bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2Icon className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Envoyer le lien
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Revenir à la connexion
        </Link>
      </p>
    </AuthCard>
  );
}
