"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2Icon } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "Identifiants invalides");
      return;
    }

    toast.success("Connecté !");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard
      title="Connexion"
      description="Accédez à votre espace HashCode."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-[#A7B0C2] uppercase tracking-wider">
              Mot de passe
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            required
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
              Se connecter
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      {}
      <p className="mt-6 text-center text-sm text-[#A7B0C2]">
        Pas encore de compte ?{" "}
        <Link
          href="/register"
          className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline transition-colors"
        >
          S&apos;inscrire
        </Link>
      </p>
    </AuthCard>
  );
}
