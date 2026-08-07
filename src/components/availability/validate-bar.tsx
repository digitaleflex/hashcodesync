import { Button } from "@/components/ui/button";
import { Loader2Icon, ShieldCheckIcon, LockIcon } from "lucide-react";

export function ValidateBar({
  locked,
  validating,
  onValidate,
  onUnvalidate,
  canValidate,
}: {
  locked: boolean;
  validating: boolean;
  onValidate: () => void;
  onUnvalidate: () => void;
  canValidate: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        {locked
          ? "Vos disponibilités sont engagées pour cette semaine."
          : "Une fois validé, vos disponibilités seront figées pour la semaine."}
      </p>
      {locked ? (
        <Button variant="outline" size="sm" onClick={onUnvalidate} disabled={validating} className="border-warning/50 text-warning hover:text-warning">
          {validating ? <Loader2Icon className="size-4 animate-spin" /> : <LockIcon className="size-4" />}
          Dévalider la semaine
        </Button>
      ) : (
        <Button size="sm" onClick={onValidate} disabled={validating || !canValidate}>
          {validating ? <Loader2Icon className="size-4 animate-spin" /> : <ShieldCheckIcon className="size-4" />}
          Valider la semaine
        </Button>
      )}
    </div>
  );
}