import { prisma } from "./prisma";

export type NotificationData = {
  type: string;
  title: string;
  message?: string;
};

export async function notifyMany(userIds: string[], data: NotificationData) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({ userId, ...data })),
  });
}