import { redirect } from "next/navigation";
import type { Route } from "next";

export const dynamic = "force-dynamic";

export default async function ResetPasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(
    `/reset-password?token=${encodeURIComponent(token)}` as Route,
  );
}
