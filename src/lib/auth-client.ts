import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [inferAdditionalFields<typeof import("../lib/auth").auth>()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
