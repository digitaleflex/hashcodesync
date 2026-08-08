import * as React from "react";

export function LogoSymbol({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <rect x="6" y="6" width="5" height="20" rx="2.5" fill="currentColor" />
      <rect x="21" y="6" width="5" height="20" rx="2.5" fill="currentColor" />
      <path d="M16 11 L21 16 L16 21 L11 16 Z" fill="currentColor" />
    </svg>
  );
}
