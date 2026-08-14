"use client";

import { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";

export function ProfileRow({
  icon,
  label,
  value,
  action,
  href,
  onClick,
  ariaLabel,
  expanded,
  className,
}: {
  icon?: ReactNode;
  label: string;
  value?: ReactNode;
  action?: ReactNode;
  href?: Route;
  onClick?: () => void;
  ariaLabel?: string;
  expanded?: boolean;
  className?: string;
}) {
  const content = (
    <>
      {icon && (
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-accent"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {label}
          </span>
          {action && (
            <span className="shrink-0 text-xs font-medium text-accent">
              {action}
            </span>
          )}
        </span>
        {value !== undefined && (
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {value}
          </span>
        )}
      </span>
      <ChevronRightIcon
        aria-hidden
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
          expanded && "rotate-90"
        )}
      />
    </>
  );

  const classes = cn(
    "group/row flex w-full min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors duration-150 select-none",
    "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    href && "cursor-pointer",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
      aria-label={ariaLabel}
      aria-expanded={expanded}
    >
      {content}
    </button>
  );
}