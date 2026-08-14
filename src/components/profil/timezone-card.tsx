"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileRow } from "@/components/profil/profile-row";
import { Clock3Icon, Loader2Icon, SaveIcon } from "lucide-react";
import {
  getAllTimezones,
  getBrowserTimezone,
  timezoneOffsetLabel,
} from "@/lib/timezones";
import { REFERENCE_TIMEZONE, REFERENCE_LABEL } from "@/lib/timezone";
import type { ProfileUser } from "@/components/profil/types";

const TIMEZONE_REGIONS = getAllTimezones();

export function TimezoneCard({
  user,
  onSaved,
}: {
  user: ProfileUser;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(user.timezone);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredRegions = TIMEZONE_REGIONS.map(({ region, zones }) => ({
    region,
    zones: q ? zones.filter((z) => z.toLowerCase().includes(q)) : zones,
  })).filter((r) => r.zones.length > 0);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: user.firstname,
          lastname: user.lastname,
          timezone: selected,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Mise à jour impossible");
        return;
      }
      toast.success("Fuseau horaire mis à jour");
      setOpen(false);
      onSaved();
    } catch {
      toast.error("Mise à jour impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ProfileRow
        icon={<Clock3Icon className="size-4.5" />}
        label="Fuseau horaire"
        value={`${user.timezone} · ${timezoneOffsetLabel(user.timezone)}`}
        action="Modifier"
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fuseau horaire</DialogTitle>
            <DialogDescription>
              Tous vos horaires sont interprétés dans ce fuseau. Il est converti
              vers le référentiel {REFERENCE_LABEL} lors de la planification
              (référentiel : {REFERENCE_TIMEZONE}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="tz-search">Rechercher un fuseau</Label>
            <Input
              id="tz-search"
              placeholder="Ex. Porto, Paris, New York…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={selected} onValueChange={(v) => setSelected(v ?? getBrowserTimezone())}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un fuseau" />
              </SelectTrigger>
              <SelectContent>
                {filteredRegions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    Aucun fuseau trouvé.
                  </p>
                ) : (
                  filteredRegions.map(({ region, zones }) => (
                    <SelectGroup key={region}>
                      <SelectLabel>{region}</SelectLabel>
                      {zones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Aperçu : {selected} ({timezoneOffsetLabel(selected)})
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
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
    </>
  );
}