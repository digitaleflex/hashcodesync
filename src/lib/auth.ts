import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { sendMail } from "./mailer";
import { actionButton, escapeHtml, footerNote, heading, highlightBox, paragraph, wrap } from "./email-templates";

export const auth = betterAuth({
  appName: "HashCode Sync",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Sécurité session : URL explicites, cookies Secure en prod, stale-time court.
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim()).filter((o): o is string => Boolean(o))
    : (process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
  },
  // Anti brute-force : activé aussi en dev (défaut better-auth = prod uniquement,
  // stockage mémoire → réinitialisé au redémarrage, mono-instance).
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/forget-password": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === "production",
    sendResetPassword: async ({ user, url }) => {
      const body = `${heading("Réinitialisation de votre mot de passe")}${paragraph(`Bonjour <strong>${escapeHtml(user.name)}</strong>,`)}${paragraph("Vous avez demandé la réinitialisation de votre mot de passe HashCode Sync. Cliquez sur le bouton ci-dessous pour en définir un nouveau.")}${highlightBox("Ce lien est valable 1 heure et ne peut être utilisé qu'une seule fois.", "warning")}${actionButton("Réinitialiser mon mot de passe", url)}${footerNote("Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe restera inchangé.")}`;
      const text = `Bonjour ${user.name},\n\nVous avez demandé la réinitialisation de votre mot de passe HashCode Sync.\n\nCliquez sur ce lien (valable 1 heure) : ${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`;
      await sendMail({
        to: user.email,
        subject: "Réinitialisation de votre mot de passe",
        text,
        html: wrap(body, "Réinitialisation de votre mot de passe", "Définissez un nouveau mot de passe pour votre compte HashCode Sync."),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: process.env.NODE_ENV === "production",
    sendVerificationEmail: async ({ user, url }) => {
      const body = `${heading("Vérifiez votre adresse e-mail")}${paragraph(`Bonjour <strong>${escapeHtml(user.name)}</strong>,`)}${paragraph("Merci de vous être inscrit sur HashCode Sync. Confirmez votre adresse e-mail pour activer votre compte et accéder à l'ensemble de la plateforme.")}${highlightBox("Ce lien de vérification est valable 24 heures.", "info")}${actionButton("Vérifier mon e-mail", url)}${footerNote("Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.")}`;
      const text = `Bonjour ${user.name},\n\nMerci de vous être inscrit sur HashCode Sync.\n\nCliquez sur ce lien pour vérifier votre adresse e-mail (valable 24h) : ${url}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.`;
      await sendMail({
        to: user.email,
        subject: "Vérifiez votre adresse e-mail",
        text,
        html: wrap(body, "Vérifiez votre adresse e-mail", "Activez votre compte HashCode Sync en confirmant votre adresse e-mail."),
      });
    },
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
  },
  user: {
    deleteUser: {
      enabled: true,
    },
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
