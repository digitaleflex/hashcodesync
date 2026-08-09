"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Loader2Icon, PencilIcon } from "lucide-react";
import { DAY_NAMES } from "@/components/availability/constants";
import type { Availability } from "@/components/availability/shared";
import { SlotFormModal } from "./slot-form-modal";

export function EditSlotDialog({
  slot,
  groups,
  onOpenChange,
  onSaved,
}: {
  slot: Availability | null;
  groups: { id: string; name: string; activities: { id: string; name: string }[] }[];
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (slot) setOpen(true);
  }, [slot]);

  return (
    <>
      <SlotFormModal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          onOpenChange(v);
        }}
        groups={groups}
        editing={slot}
        onSaved={onSaved}
      />
    </>
  );
}
