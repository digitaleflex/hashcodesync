"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/auth-card";
import { getBrowserTimezone } from "@/lib/timezones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { User, Mail, ArrowRight, Loader2Icon } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [firstname, setFirstname] = React.useState("");
  const [lastname, setLastname] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.signUp.email({
      name: `${firstname} ${lastname}`.trim(),
      email,
      password,
      firstname,
      lastname,
      timezone: getBrowserTimezone(),
    });
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "Inscription impossible");
      return;
    }

    toast.success("Compte créé ! Vérifiez votre e-mail pour activer votre compte.");
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthCard
      title="Inscription"
      description="Rejoignez la cohorte HashCode."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstname" className="text-sm font-medium text-[#A7B0C2] uppercase tracking-wider">
              Prénom
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A7B0C2]/60" />
              <Input
                id="firstname"
                placeholder="Jean"
                autoComplete="given-name"
                required
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                className="h-[52px] pl-10 pr-4 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-[#A7B0C2]/40 focus:border-primary/50 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastname" className="text-sm font-medium text-[#A7B0C2] uppercase tracking-wider">
              Nom
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A7B0C2]/60" />
              <Input
                id="lastname"
                placeholder="Dupont"
                autoComplete="family-name"
                required
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                className="h-[52px] pl-10 pr-4 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-[#A7B0C2]/40 focus:border-primary/50 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </div>

        {}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-[#A7B0C2] uppercase tracking-wider">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A7B0C2]/60" />
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[52px] pl-10 pr-4 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-[#A7B0C2]/40 focus:border-primary/50 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-[#A7B0C2] uppercase tracking-wider">
            Mot de passe
          </Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="8 caractères minimum"
            autoComplete="new-password"
            required
            minLength={8}
            className="h-[52px] pl-10 pr-4 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-[#A7B0C2]/40 focus:border-primary/50 focus:ring-primary/20 transition-all"
          />
          </div>

        {}
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
              Créer mon compte
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      {}
      <p className="mt-6 text-center text-sm text-[#A7B0C2]">
        Déjà membre ?{" "}
        <Link
          href="/login"
          className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline transition-colors"
        >
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
}
