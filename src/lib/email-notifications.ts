import { prisma } from "./prisma";
import { sendMail } from "./mailer";

type EmailNotificationInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  type?: string;
};

async function getUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email ?? null;
}

async function sendEmailNotification(input: EmailNotificationInput): Promise<void> {
  try {
    await sendMail({
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  } catch (error) {
    console.error(`[EmailNotification] Failed to send ${input.type ?? "email"} to ${input.to}`, error);
  }
}

export async function notifyByEmail(userId: string, data: { subject: string; text: string; html?: string; type?: string }) {
  const email = await getUserEmail(userId);
  if (!email) return;
  await sendEmailNotification({ to: email, ...data });
}

export async function notifyManyByEmail(userIds: string[], data: { subject: string; text: string; html?: string; type?: string }) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, email: true },
  });

  const emailMap = new Map(users.map((u) => [u.id, u.email]));
  const emails = uniqueIds
    .map((id) => emailMap.get(id))
    .filter((email): email is string => !!email);

  if (emails.length === 0) return;

  await Promise.all(
    emails.map((email) =>
      sendEmailNotification({
        to: email,
        subject: data.subject,
        text: data.text,
        html: data.html,
        type: data.type,
      })
    )
  );
}
