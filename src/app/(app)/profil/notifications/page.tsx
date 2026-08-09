"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

export default function NotificationPreferencesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profil");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2Icon className="size-8 animate-spin text-accent" />
    </div>
  );
}
