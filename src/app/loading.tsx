import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Loader2Icon className="size-8 animate-spin text-accent" />
    </main>
  );
}
