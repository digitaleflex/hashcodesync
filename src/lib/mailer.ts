import nodemailer from "nodemailer";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type MailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(input: MailInput): Promise<void> {
  if (resend) {
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? process.env.SMTP_FROM ?? "HashCode Sync <no-reply@localhost>",
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return;
  }

  const host = process.env.SMTP_HOST;
  if (!host) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[HashCode Sync] [${input.to}] ${input.subject}\n${input.text}`
      );
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "HashCode Sync <no-reply@localhost>",
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}

export async function testMailer(to?: string): Promise<{ ok: boolean; message: string }> {
  const target = to ?? "test@example.com";
  try {
    await sendMail({
      to: target,
      subject: "Test mailer HashCode Sync",
      text: "Si vous recevez ce message, le système de messagerie fonctionne.",
    });
    return { ok: true, message: `E-mail de test envoyé à ${target}` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}