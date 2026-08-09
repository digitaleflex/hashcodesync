import { prisma } from "./prisma";
import { notifyManyByEmail } from "./email-notifications";
import { actionButton, escapeHtml, heading, highlightBox, paragraph, wrap } from "./email-templates";

type EmailContext = {
  actorName?: string;
  workshopTitle?: string;
  groupName?: string;
  actionUrl?: string;
  [key: string]: unknown;
};

type PreferenceKey = "emailWorkshops" | "emailGroups" | "emailMentoring" | "emailSecurity" | "emailReminders";

const templates: Record<string, { pref: PreferenceKey; build: (ctx: EmailContext) => { subject: string; text: string; html: string } }> = {
  new_workshop: {
    pref: "emailWorkshops",
    build: (ctx) => {
      const body = `${heading("Nouvel atelier disponible")}${paragraph(`${ctx.actorName ?? "Un membre"} a créé un nouvel atelier : <strong>${escapeHtml(ctx.workshopTitle ?? "")}</strong>.`)}${highlightBox("Réservez votre place avant que les places ne soient complètes.", "info")}${actionButton("Voir l'atelier", ctx.actionUrl ?? "https://sync.joinhashcode.com/ateliers")}${paragraph("Connectez-vous à HashCode Sync pour plus de détails et pour vous inscrire.")}`;
      const text = `Bonjour,\n\n${ctx.actorName ?? "Un membre"} a créé un nouvel atelier : ${ctx.workshopTitle}.\n\nConnectez-vous à HashCode Sync pour plus de détails.`;
      return { subject: `Nouvel atelier : ${ctx.workshopTitle}`, text, html: wrap(body, `Nouvel atelier : ${ctx.workshopTitle}`) };
    },
  },

  workshop_update: {
    pref: "emailWorkshops",
    build: (ctx) => {
      const body = `${heading("Atelier modifié")}${paragraph(`L'atelier <strong>${escapeHtml(ctx.workshopTitle ?? "")}</strong> a été modifié par ${ctx.actorName ?? "le créateur"}.<br/>Vérifiez les nouvelles informations avant de vous rendre à la session.`)}${actionButton("Voir l'atelier", ctx.actionUrl ?? "https://sync.joinhashcode.com/ateliers")}`;
      const text = `Bonjour,\n\nL'atelier "${ctx.workshopTitle}" a été modifié par ${ctx.actorName ?? "le créateur"}.\n\nConnectez-vous pour voir les changements.`;
      return { subject: `Atelier modifié : ${ctx.workshopTitle}`, text, html: wrap(body, `Atelier modifié : ${ctx.workshopTitle}`) };
    },
  },

  workshop_cancelled: {
    pref: "emailWorkshops",
    build: (ctx) => {
      const body = `${heading("Atelier annulé")}${paragraph(`L'atelier <strong>${escapeHtml(ctx.workshopTitle ?? "")}</strong> a été annulé.`)}${highlightBox("Nous sommes désolés pour ce changement.", "warning")}`;
      const text = `Bonjour,\n\nL'atelier "${ctx.workshopTitle}" a été annulé.\n\nNous sommes désolés pour ce changement.`;
      return { subject: `Atelier annulé : ${ctx.workshopTitle}`, text, html: wrap(body, `Atelier annulé : ${ctx.workshopTitle}`) };
    },
  },

  participant_joined: {
    pref: "emailWorkshops",
    build: (ctx) => {
      const body = `${heading("Nouveau participant")}${paragraph(`${ctx.actorName ?? "Un membre"} a rejoint l'atelier <strong>${escapeHtml(ctx.workshopTitle ?? "")}</strong>.`)}${highlightBox("Un nouveau participant vient de s'inscrire.", "success")}${actionButton("Voir l'atelier", ctx.actionUrl ?? "https://sync.joinhashcode.com/ateliers")}`;
      const text = `Bonjour,\n\n${ctx.actorName ?? "Un membre"} a rejoint l'atelier "${ctx.workshopTitle}".`;
      return { subject: `Nouveau participant : ${ctx.workshopTitle}`, text, html: wrap(body, `Nouveau participant : ${ctx.workshopTitle}`) };
    },
  },

  group_invite: {
    pref: "emailGroups",
    build: (ctx) => {
      const body = `${heading("Invitation à rejoindre un groupe")}${paragraph(`Vous avez été invité à rejoindre le groupe <strong>${escapeHtml(ctx.groupName ?? "")}</strong> par ${ctx.actorName ?? "un membre"}.`)}${highlightBox("Acceptez l'invitation pour accéder aux disponibilités et ateliers du groupe.", "info")}${actionButton("Voir l'invitation", ctx.actionUrl ?? "https://sync.joinhashcode.com/groupes")}`;
      const text = `Bonjour,\n\nVous avez été invité à rejoindre le groupe "${ctx.groupName}" par ${ctx.actorName ?? "un membre"}.\n\nAcceptez l'invitation depuis HashCode Sync.`;
      return { subject: `Invitation à rejoindre : ${ctx.groupName}`, text, html: wrap(body, `Invitation : ${ctx.groupName}`) };
    },
  },

  group_join_request: {
    pref: "emailGroups",
    build: (ctx) => {
      const body = `${heading("Nouvelle demande d'accès")}${paragraph(`${ctx.actorName ?? "Un membre"} a demandé à rejoindre le groupe <strong>${escapeHtml(ctx.groupName ?? "")}</strong>.`)}${highlightBox("Traitez la demande depuis votre tableau de bord.", "info")}${actionButton("Gérer les demandes", ctx.actionUrl ?? "https://sync.joinhashcode.com/admin/groupes")}`;
      const text = `Bonjour,\n\n${ctx.actorName ?? "Un membre"} a demandé à rejoindre le groupe "${ctx.groupName}".\n\nTraitez la demande depuis HashCode Sync.`;
      return { subject: `Demande de rejoindre : ${ctx.groupName}`, text, html: wrap(body, `Demande : ${ctx.groupName}`) };
    },
  },

  group_join_accepted: {
    pref: "emailGroups",
    build: (ctx) => {
      const body = `${heading("Demande acceptée")}${paragraph(`Votre demande d'accès au groupe <strong>${escapeHtml(ctx.groupName ?? "")}</strong> a été acceptée.`)}${highlightBox("Vous pouvez maintenant rejoindre le groupe et commencer à collaborer.", "success")}${actionButton("Accéder au groupe", ctx.actionUrl ?? "https://sync.joinhashcode.com/groupes")}`;
      const text = `Bonjour,\n\nVotre demande d'accès au groupe "${ctx.groupName}" a été acceptée.\n\nVous pouvez maintenant rejoindre le groupe.`;
      return { subject: `Demande acceptée : ${ctx.groupName}`, text, html: wrap(body, `Accès accepté : ${ctx.groupName}`) };
    },
  },

  group_join_rejected: {
    pref: "emailGroups",
    build: (ctx) => {
      const body = `${heading("Demande refusée")}${paragraph(`Votre demande d'accès au groupe <strong>${escapeHtml(ctx.groupName ?? "")}</strong> a été refusée.`)}${highlightBox("Vous pouvez soumettre une nouvelle demande plus tard.", "warning")}`;
      const text = `Bonjour,\n\nVotre demande d'accès au groupe "${ctx.groupName}" a été refusée.\n\nVous pouvez soumettre une nouvelle demande plus tard.`;
      return { subject: `Demande refusée : ${ctx.groupName}`, text, html: wrap(body, `Demande refusée : ${ctx.groupName}`) };
    },
  },

  group_joined: {
    pref: "emailGroups",
    build: (ctx) => {
      const body = `${heading("Nouveau membre")}${paragraph(`${ctx.actorName ?? "Un membre"} a rejoint le groupe <strong>${escapeHtml(ctx.groupName ?? "")}</strong>.`)}${highlightBox("Bienvenue à nouveau membre !", "success")}`;
      const text = `Bonjour,\n\n${ctx.actorName ?? "Un membre"} a rejoint le groupe "${ctx.groupName}".`;
      return { subject: `Nouveau membre : ${ctx.groupName}`, text, html: wrap(body, `Nouveau membre : ${ctx.groupName}`) };
    },
  },

  mentorship_session: {
    pref: "emailMentoring",
    build: (ctx) => {
      const body = `${heading("Nouvelle session de mentorat")}${paragraph(`${ctx.actorName ?? "Un membre"} a planifié une session de mentorat.`)}${highlightBox("Consultez votre calendrier pour plus de détails.", "info")}${actionButton("Voir le calendrier", ctx.actionUrl ?? "https://sync.joinhashcode.com/mentor")}`;
      const text = `Bonjour,\n\n${ctx.actorName ?? "Un membre"} a planifié une session de mentorat.\n\nConsultez HashCode Sync pour les détails.`;
      return { subject: "Nouvelle session de mentorat", text, html: wrap(body, "Session de mentorat") };
    },
  },

  mentorship_reminder: {
    pref: "emailMentoring",
    build: (ctx) => {
      const body = `${heading("Rappel : session de mentorat")}${paragraph("Vous avez une session de mentorat à venir. Connectez-vous pour plus d'informations.")}${highlightBox("Préparez vos questions et vos disponibilités.", "warning")}${actionButton("Voir la session", ctx.actionUrl ?? "https://sync.joinhashcode.com/mentor")}`;
      const text = `Bonjour,\n\nVous avez une session de mentorat à venir.\n\nConnectez-vous pour plus d'informations.`;
      return { subject: "Rappel : session de mentorat", text, html: wrap(body, "Rappel mentorat") };
    },
  },

  availability_reminder: {
    pref: "emailReminders",
    build: () => {
      const body = `${heading("Rappel : disponibilités")}${paragraph("N'oubliez pas de mettre à jour vos disponibilités pour la semaine à venir.")}${highlightBox("Des disponibilités à jour aident la cohorte à trouver les meilleurs créneaux.", "info")}${actionButton("Mettre à jour", "https://sync.joinhashcode.com/disponibilites")}`;
      const text = `Bonjour,\n\nN'oubliez pas de mettre à jour vos disponibilités pour la semaine à venir.\n\nHashCode Sync`;
      return { subject: "Rappel : disponibilités", text, html: wrap(body, "Rappel disponibilités") };
    },
  },

  availability_validation: {
    pref: "emailReminders",
    build: () => {
      const body = `${heading("Disponibilités validées")}${paragraph("Vos disponibilités ont été validées pour cette semaine.")}${highlightBox("Votre semaine est maintenant figée. Vous serez notifié·e des ateliers planifiés.", "success")}${actionButton("Voir mes disponibilités", "https://sync.joinhashcode.com/disponibilites")}`;
      const text = `Bonjour,\n\nVos disponibilités ont été validées.\n\nHashCode Sync`;
      return { subject: "Disponibilités validées", text, html: wrap(body, "Disponibilités validées") };
    },
  },

  workshop_reminder: {
    pref: "emailReminders",
    build: (ctx) => {
      const body = `${heading("Rappel d'atelier")}${paragraph(`L'atelier <strong>${escapeHtml(ctx.workshopTitle ?? "")}</strong> commence bientôt.`)}${highlightBox("Préparez-vous et rejoignez le créneau à l'heure.", "warning")}${actionButton("Voir l'atelier", ctx.actionUrl ?? "https://sync.joinhashcode.com/ateliers")}`;
      const text = `Bonjour,\n\nL'atelier "${ctx.workshopTitle ?? ""}" commence bientôt.\n\nHashCode Sync`;
      return { subject: `Rappel : ${ctx.workshopTitle ?? "atelier"}`, text, html: wrap(body, `Rappel : ${ctx.workshopTitle ?? "atelier"}`) };
    },
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

  const { subject, text, html } = template.build(ctx);

  await Promise.all(
    emailsToNotify.map((user) =>
      notifyManyByEmail([user.id], {
        subject,
        text,
        html,
        type: `email_${type}`,
      })
    )
  );
}
