"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      router.replace(`/reset-password/${token}`);
    } else {
      router.replace("/login");
    }
  }, [searchParams, router]);

  return null;
}
