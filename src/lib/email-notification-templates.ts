import { prisma } from "./prisma";
import { notifyManyByEmail } from "./email-notifications";

type EmailContext = {
  actorName?: string;
  workshopTitle?: string;
  groupName?: string;
  [key: string]: unknown;
};

type PreferenceKey = "emailWorkshops" | "emailGroups" | "emailMentoring" | "emailSecurity" | "emailReminders";

const templates: Record<string, { pref: PreferenceKey; build: (ctx: EmailContext) => { subject: string; text: string } }> = {
  new_workshop: {
    pref: "emailWorkshops",
    build: (ctx) => ({
      subject: `Nouvel atelier : ${ctx.workshopTitle}`,
      text: `Bonjour,\n\n${ctx.actorName ?? "Un membre"} a créé un nouvel atelier : ${ctx.workshopTitle}.\n\nConnectez-vous à HashCode Sync pour plus de détails.`,
    }),
  },

  workshop_update: {
    pref: "emailWorkshops",
    build: (ctx) => ({
      subject: `Atelier modifié : ${ctx.workshopTitle}`,
      text: `Bonjour,\n\nL'atelier "${ctx.workshopTitle}" a été modifié par ${ctx.actorName ?? "le créateur"}.\n\nConnectez-vous pour voir les changements.`,
    }),
  },

  workshop_cancelled: {
    pref: "emailWorkshops",
    build: (ctx) => ({
      subject: `Atelier annulé : ${ctx.workshopTitle}`,
      text: `Bonjour,\n\nL'atelier "${ctx.workshopTitle}" a été annulé.\n\nNous sommes désolés pour ce changement.`,
    }),
  },

  participant_joined: {
    pref: "emailWorkshops",
    build: (ctx) => ({
      subject: `Nouveau participant : ${ctx.workshopTitle}`,
      text: `Bonjour,\n\n${ctx.actorName ?? "Un membre"} a rejoint l'atelier "${ctx.workshopTitle}".`,
    }),
  },

  group_invite: {
    pref: "emailGroups",
    build: (ctx) => ({
      subject: `Invitation à rejoindre : ${ctx.groupName}`,
      text: `Bonjour,\n\nVous avez été invité à rejoindre le groupe "${ctx.groupName}" par ${ctx.actorName ?? "un membre"}.\n\nAcceptez l'invitation depuis HashCode Sync.`,
    }),
  },

  group_join_request: {
    pref: "emailGroups",
    build: (ctx) => ({
      subject: `Demande de rejoindre : ${ctx.groupName}`,
      text: `Bonjour,\n\n${ctx.actorName ?? "Un membre"} a demandé à rejoindre le groupe "${ctx.groupName}".\n\nTraitez la demande depuis HashCode Sync.`,
    }),
  },

  group_join_accepted: {
    pref: "emailGroups",
    build: (ctx) => ({
      subject: `Demande acceptée : ${ctx.groupName}`,
      text: `Bonjour,\n\nVotre demande d'accès au groupe "${ctx.groupName}" a été acceptée.\n\nVous pouvez maintenant rejoindre le groupe.`,
    }),
  },

  group_join_rejected: {
    pref: "emailGroups",
    build: (ctx) => ({
      subject: `Demande refusée : ${ctx.groupName}`,
      text: `Bonjour,\n\nVotre demande d'accès au groupe "${ctx.groupName}" a été refusée.\n\nVous pouvez soumettre une nouvelle demande plus tard.`,
    }),
  },

  group_joined: {
    pref: "emailGroups",
    build: (ctx) => ({
      subject: `Nouveau membre : ${ctx.groupName}`,
      text: `Bonjour,\n\n${ctx.actorName ?? "Un membre"} a rejoint le groupe "${ctx.groupName}".`,
    }),
  },

  mentorship_session: {
    pref: "emailMentoring",
    build: (ctx) => ({
      subject: "Nouvelle session de mentorat",
      text: `Bonjour,\n\n${ctx.actorName ?? "Un membre"} a planifié une session de mentorat.\n\nConsultez HashCode Sync pour les détails.`,
    }),
  },

  mentorship_reminder: {
    pref: "emailMentoring",
    build: (ctx) => ({
      subject: "Rappel : session de mentorat",
      text: `Bonjour,\n\nVous avez une session de mentorat à venir.\n\nConnectez-vous pour plus d'informations.`,
    }),
  },

  availability_reminder: {
    pref: "emailReminders",
    build: () => ({
      subject: "Rappel : disponibilités",
      text: `Bonjour,\n\nN'oubliez pas de mettre à jour vos disponibilités pour la semaine à venir.\n\nHashCode Sync`,
    }),
  },

  availability_validation: {
    pref: "emailReminders",
    build: () => ({
      subject: "Disponibilités validées",
      text: `Bonjour,\n\nVos disponibilités ont été validées.\n\nHashCode Sync`,
    }),
  },

  workshop_reminder: {
    pref: "emailReminders",
    build: (ctx) => ({
      subject: `Rappel : ${ctx.workshopTitle ?? "atelier"}`,
      text: `Bonjour,\n\nL'atelier "${ctx.workshopTitle ?? ""}" commence bientôt.\n\nHashCode Sync`,
    }),
  },
};

async function getUserPreference(userId: string, key: PreferenceKey): Promise<boolean> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: { [key]: true },
  });
  return pref?.[key] ?? true;
}

export async function sendEmailForNotification(
  userIds: string[],
  type: string,
  ctx: EmailContext = {}
) {
  const template = templates[type];
  if (!template) return;

  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, email: true },
  });

  const preferences = await Promise.all(
    users.map((u) => getUserPreference(u.id, template.pref))
  );

  const emailsToNotify = users.filter((u, i) => preferences[i]);

  if (emailsToNotify.length === 0) return;

  const { subject, text } = template.build(ctx);

  await Promise.all(
    emailsToNotify.map((user) =>
      notifyManyByEmail([user.id], {
        subject,
        text,
        type: `email_${type}`,
      })
    )
  );
}
