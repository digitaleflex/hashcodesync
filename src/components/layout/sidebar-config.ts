export interface NavItem {
  href: string;
  label: string;
  icon: string;
  desc: string;
  exact?: boolean;
  roles: ("member" | "mentor" | "admin")[];
}

export const NAV_ITEMS: NavItem[] = [
  // Member nav
  { href: "/dashboard", label: "Tableau de bord", icon: "LayoutDashboard", desc: "Vue d'ensemble", roles: ["member", "mentor", "admin"] },
  { href: "/agenda", label: "Agenda", icon: "CalendarDays", desc: "Programme semaine", roles: ["member", "mentor", "admin"] },
  { href: "/disponibilites", label: "Disponibilités", icon: "CalendarRange", desc: "Mes créneaux", roles: ["member", "mentor", "admin"] },
  { href: "/ateliers", label: "Ateliers", icon: "BookOpen", desc: "Sessions à venir", roles: ["member", "mentor", "admin"] },
  { href: "/groupes", label: "Groupes", icon: "Users", desc: "Mes équipes", roles: ["member", "mentor", "admin"] },

  // Mentor specific
  { href: "/mentor", label: "Vue Mentor", icon: "GraduationCap", desc: "Cohorte & créneaux", exact: true, roles: ["mentor", "admin"] },

  // Admin specific
  { href: "/admin", label: "Dashboard Admin", icon: "LayoutDashboard", desc: "Vue d'ensemble", exact: true, roles: ["admin"] },
  { href: "/admin/disponibilites", label: "Disponibilités", icon: "CalendarCheck2", desc: "Membres & validation", roles: ["admin"] },
  { href: "/admin/ateliers", label: "Ateliers", icon: "BookOpen", desc: "Gérer les sessions", roles: ["admin"] },
  { href: "/admin/groupes", label: "Groupes", icon: "Users", desc: "Équipes & demandes", roles: ["admin"] },
  { href: "/admin/broadcast", label: "Broadcast", icon: "Mail", desc: "E-mail à tous", roles: ["admin"] },

  // Preview links (admin sees member view)
  { href: "/agenda", label: "Agenda (vue membre)", icon: "CalendarDays", desc: "Prévisualiser", roles: ["admin"] },
  { href: "/ateliers", label: "Ateliers (vue membre)", icon: "BookOpen", desc: "Prévisualiser", roles: ["admin"] },
];

export function getNavForRole(role: string): NavItem[] {
  const roleKey = role as "member" | "mentor" | "admin";
  return NAV_ITEMS.filter((item) => item.roles.includes(roleKey));
}

export const SIDEBAR_CONFIG = {
  member: {
    title: "Espace Membre",
    subtitle: "Mon espace",
    description: "Gère tes dispos, rejoins les ateliers et suis l'agenda de la team.",
    brandIcon: "User",
    brandColor: "bg-primary",
    accentColor: "bg-primary/10",
    activeBg: "bg-primary",
    activeText: "text-primary-foreground",
    hoverBg: "bg-muted",
    badge: null,
  },
  mentor: {
    title: "Espace Mentor",
    subtitle: "Pilotage cohorte",
    description: "Trouve les meilleurs créneaux et accompagne la team.",
    brandIcon: "GraduationCap",
    brandColor: "bg-primary",
    accentColor: "bg-primary/10",
    activeBg: "bg-primary",
    activeText: "text-primary-foreground",
    hoverBg: "bg-muted",
    badge: null,
  },
  admin: {
    title: "Espace Admin",
    subtitle: "Administration",
    description: "Pilotage global, validation et communication.",
    brandIcon: "ShieldCheck",
    brandColor: "bg-primary",
    accentColor: "bg-primary/10",
    activeBg: "bg-primary",
    activeText: "text-primary-foreground",
    hoverBg: "bg-muted",
    badge: {
      label: "Heatmap + Reco",
      icon: "BarChart3",
      description: "Recommandations basées sur les dispos validées.",
    },
  },
} as const;

export type SpaceKey = keyof typeof SIDEBAR_CONFIG;

export function getSpaceKey(pathname: string, role: string): SpaceKey {
  if (pathname.startsWith("/admin") && role === "admin") return "admin";
  if (pathname.startsWith("/mentor") && (role === "mentor" || role === "admin")) return "mentor";
  return "member";
}

export const MOBILE_NAV_CONFIG = {
  member: [
    { href: "/dashboard", label: "Accueil", icon: "LayoutDashboard", match: "/dashboard" },
    { href: "/agenda", label: "Agenda", icon: "CalendarDays", match: "/agenda" },
    { href: "/disponibilites", label: "Dispo", icon: "CalendarRange", match: "/disponibilites" },
    { href: "/ateliers", label: "Ateliers", icon: "BookOpen", match: "/ateliers" },
  ],
  mentor: [
    { href: "/mentor", label: "Mentor", icon: "GraduationCap", match: "/mentor" },
    { href: "/agenda", label: "Agenda", icon: "CalendarDays", match: "/agenda" },
    { href: "/ateliers", label: "Ateliers", icon: "BookOpen", match: "/ateliers" },
    { href: "/groupes", label: "Groupes", icon: "Users", match: "/groupes" },
  ],
  admin: [
    { href: "/admin", label: "Admin", icon: "ShieldCheck", match: "/admin" },
    { href: "/admin/disponibilites", label: "Dispos", icon: "CalendarRange", match: "/admin/disponibilites" },
    { href: "/admin/broadcast", label: "Mail", icon: "Mail", match: "/admin/broadcast" },
    { href: "/agenda", label: "Agenda", icon: "CalendarDays", match: "/agenda" },
  ],
} as const;