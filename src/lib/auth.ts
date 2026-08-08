import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  appName: "HashCode Sync",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Sécurité session : URL explicites, cookies Secure en prod, stale-time court.
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Dev : pas de SMTP configuré, on logue le lien pour récupération locale.
      // IMPORTANT : à remplacer par un vrai envoi d'e-mail (SMTP) en production.
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[HashCode Sync] Lien de réinitialisation pour ${user.email} : ${url}`
        );
      }
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "member",
        input: false,
      },
      firstname: {
        type: "string",
        required: true,
      },
      lastname: {
        type: "string",
        required: true,
      },
      timezone: {
        type: "string",
        defaultValue: "Africa/Porto-Novo",
        input: true,
      },
    },
  },
});
