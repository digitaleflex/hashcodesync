import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { sendMail } from "./mailer";

export const auth = betterAuth({
  appName: "HashCode Sync",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Sécurité session : URL explicites, cookies Secure en prod, stale-time court.
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [process.env.BETTER_AUTH_URL].filter(Boolean),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Réinitialisation de votre mot de passe",
        text: `Bonjour ${user.name},\n\nVous avez demandé la réinitialisation de votre mot de passe HashCode Sync.\n\nCliquez sur ce lien (valable 1 heure) : ${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
      });
    },
  },
  emailVerification: {
    enabled: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Vérifiez votre adresse e-mail",
        text: `Bonjour ${user.name},\n\nMerci de vous être inscrit sur HashCode Sync.\n\nCliquez sur ce lien pour vérifier votre adresse e-mail (valable 24h) : ${url}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.`,
      });
    },
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
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
