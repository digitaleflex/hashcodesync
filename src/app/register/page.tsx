"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.signUp.email({
      name: `${firstname} ${lastname}`.trim(),
      email,
      password,
      firstname,
      lastname,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "Inscription impossible");
      return;
    }

    toast.success("Compte créé !");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard
      title="Inscription"
      description="Rejoignez la cohorte HashCode."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstname">Prénom</Label>
            <Input
              id="firstname"
              placeholder="Jean"
              autoComplete="given-name"
              required
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastname">Nom</Label>
            <Input
              id="lastname"
              placeholder="Dupont"
              autoComplete="family-name"
              required
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="vous@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            placeholder="8 caractères minimum"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" disabled={loading} className="mt-2">
          {loading && <Loader2Icon className="animate-spin" />}
          Créer mon compte
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Déjà membre ?{" "}
        <Link
          href="/login"
          className="text-accent underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
}
