import { ReactNode } from "react";

export function ProfileSectionTitle({
  title,
  description,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="font-heading text-base font-semibold tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}