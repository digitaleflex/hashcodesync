"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  UserCircle2Icon,
  PencilIcon,
  Loader2Icon,
  SaveIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import type { ProfileUser, ProfileGroup } from "@/components/profil/types";

const roleLabels: Record<string, string> = {
  member: "Membre",
  mentor: "Mentor",
  admin: "Administrateur",
};

function getInitials(firstname?: string, lastname?: string): string {
  const f = firstname?.charAt(0).toUpperCase() ?? "?";
  const l = lastname?.charAt(0).toUpperCase() ?? "";
  return f + l;
}

export function IdentityCard({
  user,
  groups,
  onSaved,
}: {
  user: ProfileUser;
  groups: ProfileGroup[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [firstname, setFirstname] = useState(user.firstname);
  const [lastname, setLastname] = useState(user.lastname);
  const [image, setImage] = useState<string | null>(user.image);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const initials = getInitials(user.firstname, user.lastname);
  const memberSince = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(user.createdAt));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Format non supporté (jpg, png, webp, gif)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (5 Mo maximum)");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Upload impossible");
        return;
      }
      setImage(json.url);
    } catch {
      toast.error("Upload impossible");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!firstname.trim() || !lastname.trim()) {
      toast.error("Prénom et nom sont requis");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          ...(image ? { image } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Mise à jour impossible");
        return;
      }
      toast.success("Identité mise à jour");
      setOpen(false);
      onSaved();
    } catch {
      toast.error("Mise à jour impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCircle2Icon className="size-5 text-accent" />
          Identité
        </CardTitle>
        <CardDescription>Visibles par la cohorte et les mentors.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="relative size-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              <AvatarImage src={image ?? undefined} alt={user.name} />
            </Avatar>
            <div className="min-w-0 space-y-1">
              <p className="truncate font-heading text-lg font-semibold">
                {user.firstname} {user.lastname}
              </p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {roleLabels[user.role] ?? "Membre"}
                </Badge>
                {groups.length > 0 && (
                  <Badge variant="outline">
                    {groups.map((g) => g.name).join(", ")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={() => setOpen(true)}>
            <PencilIcon className="size-4" />
            Modifier mon profil
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Membre depuis le {memberSince}
          {!user.emailVerified && " · e-mail non vérifié"}
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier mon profil</DialogTitle>
              <DialogDescription>
                Ces informations sont visibles par la cohorte.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-4">
              <Avatar size="lg" className="relative size-16">
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                <AvatarImage src={image ?? undefined} alt={user.name} />
              </Avatar>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  render={
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <UploadIcon className="size-4" />
                      {uploading ? "Upload…" : "Changer la photo"}
                    </Label>
                  }
                />
                {image && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Retirer la photo"
                    onClick={() => setImage(null)}
                  >
                    <XIcon className="size-4" />
                    Retirer
                  </Button>
                )}
              </div>
            </div>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstname">Prénom</Label>
                <Input
                  id="firstname"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Nom</Label>
                <Input
                  id="lastname"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={user.email} disabled />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}