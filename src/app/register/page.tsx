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
import {
  User,
  Mail,
  ArrowRight,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react";

const STRENGTH_STEPS = [
  { met: (pw: string) => pw.length >= 8, label: "8 caractères minimum" },
  {
    met: (pw: string) => /[a-z]/i.test(pw) && /\d/.test(pw),
    label: "Lettres et chiffres",
  },
  { met: (pw: string) => /[A-Z]/.test(pw), label: "Une majuscule" },
  {
    met: (pw: string) => pw.length >= 12 || /[^a-zA-Z0-9]/.test(pw),
    label: "12 caractères ou un symbole",
  },
];

const STRENGTH_LABELS = ["Trop court", "Faible", "Moyen", "Bon", "Fort"];
const STRENGTH_COLORS = [
  "",
  "bg-destructive",
  "bg-warning",
  "bg-warning",
  "bg-success",
];

export default function RegisterPage() {
  const router = useRouter();
  const [firstname, setFirstname] = React.useState("");
  const [lastname, setLastname] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const errorRef = React.useRef<HTMLParagraphElement>(null);

  const score = password ? STRENGTH_STEPS.filter((s) => s.met(password)).length : -1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setLoading(true);
    setError(null);
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
      setError(error.message ?? "Inscription impossible. Réessayez.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    toast.success(
      "Compte créé ! Vérifiez votre e-mail pour activer votre compte.",
    );
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthCard
      title="Inscription"
      description="Rejoignez la cohorte HashCode."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstname" className="text-muted-foreground">
              Prénom
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                id="firstname"
                name="given-name"
                placeholder="Jean"
                autoComplete="given-name"
                required
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                className="h-[52px] pl-10 pr-4 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastname" className="text-muted-foreground">
              Nom
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                id="lastname"
                name="family-name"
                placeholder="Dupont"
                autoComplete="family-name"
                required
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                className="h-[52px] pl-10 pr-4 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-muted-foreground">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="vous@exemple.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={error ? "auth-error" : undefined}
              className="h-[52px] pl-10 pr-4 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-muted-foreground">
            Mot de passe
          </Label>
          <PasswordInput
            id="password"
            name="new-password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            placeholder="8 caractères minimum"
            autoComplete="new-password"
            required
            aria-describedby={`password-hint${error ? " auth-error" : ""}`}
            aria-invalid={!!error && password.length < 8}
            className="h-[52px] pl-10 pr-12 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
          />

          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    i < score ? STRENGTH_COLORS[score] : "bg-white/[0.08]"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
              {password ? STRENGTH_LABELS[score] : STRENGTH_STEPS[0].label}
            </span>
          </div>
          <p id="password-hint" className="sr-only">
            Le mot de passe doit contenir au moins 8 caractères.
          </p>
        </div>

        {error && (
          <p
            ref={errorRef}
            id="auth-error"
            role="alert"
            tabIndex={-1}
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive outline-none"
          >
            <AlertCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          aria-busy={loading}
          className="h-[52px] w-full bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2Icon className="h-5 w-5 animate-spin" aria-hidden="true" />
              Création…
            </>
          ) : (
            <>
              Créer mon compte
              <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
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
