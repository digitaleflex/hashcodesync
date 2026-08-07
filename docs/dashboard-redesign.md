# Refonte Dashboard — « Cockpit » de coordination

Rôle : Principal Product Designer
Portée : refonte de `src/app/(app)/dashboard/page.tsx` (la seule page touchée).
Contraintes : **aucune** modification d'API, de routes, de logique métier ni de modèles de données. Design system existant conservé. ≤ 30 s de lecture par l'utilisateur. Zones tactiles ≥ 44 px. WCAG AA. Responsive 5 casses (base → 2xl).

---

## 1. Audit de l'écran actuel

| Constat | Détail |
|---|---|
| **Spread de cartes statiques, pas de hiérarchie** | 3 KPIs + 2 blocs "navigation" diffusent chacun vers une page. Aucun gain d'info actionable. |
| **Pas de conscience du rôle** | Toute la page affiche le même contenu pour `member`, `mentor`, `admin`. Or les données disponibles diffèrent selon le rôle (voir §3). |
| **Données pauvres** | `availCount` = nombre brut de créneaux ; `upcoming` = décompte d'ateliers. Aucune semaine contextuelle, aucun créneau recommandé, aucune chaleur d'activité. |
| **Zones cliquables** | Boutons volumétriques OK (≥ 44 px) mais aucun lien n'est une "action principale" claire. |
| **Accessibilité** | Pas de `aria-pressed` sur toggles, pas de contraste vérifié pour le badge de rôle, aucun état de chargement par bloc (tout ou rien via un spinner plein écran). |
| **Langue** | Cohérence `fr-FR` globalement respectée ; imperatifs créneaux restent corrects. |
| **Responsive** | `sm:grid-cols-2 lg:grid-cols-3` et `md:grid-cols-2` → seules 2 casses exploitées sur 5 demandées. |

**Verdict** : la page est un "hub de navigation", pas un tableau de bord. Elle consomme correctement GET-only sans écriture, ce qui **respecte déjà la contrainte**. Le travail consiste à réorganiser l'information en couches selon le rôle.

---

## 2. Audit des données réellement disponibles (sans toucher aux API)

> **Résultat déterminant** : les deux endpoints riches (`/api/mentor/scheduling`, `/api/admin/scheduling`) renvoient heatmap + recommandation mais **bloquent le rôle `member` en 403**. Le dashboard membre ne peut donc **pas** afficher la heatmap de cohorte ni les créneaux recommandés sans modification d'API — interdite ici.

Données à disposition du dashboard par rôle (endpoints existants, lecture seule) :

| Endpoint | Rôle | Données exploitables |
|---|---|---|
| `/api/availabilities` | tous | propres créneaux `[weekStart, day, startTime, endTime]` → mini-heatmap *personnelle* |
| `/api/availabilities/validate` | tous | état de validation hebdo (verrou) |
| `/api/workshops` | tous | liste des ateliers → prochains, série, image éventuelle |
| `/api/user` | tous | statut 2FA, profil perso → résumé personnel |
| `/api/groups` | tous | groupes, image de couverture, validé ? |
| `/api/member/scheduling` | **mentor/admin seulement** | heatmap de cohorte, `groups`, `upcomingWorkshops` |
| `/api/admin/groups` | **admin seulement** | groupes + `weekValidated`/`weekValidatedAt` |

**Conséquence de conception** : le dashboard devient **aware-of-the-role**. On expose trois variantes du même cockpit :
- **Member** → cockpit personnel (heatmap/statistiques propres, prochains ateliers, résumé perso). Pas de heatmap cohorte.
- **Mentor** → + heatmap cohorte + créneau recommandé (depuis `/api/mentor/scheduling`).
- **Admin** → comme mentor, avec leviers de validation-groups via `/api/admin/groups`.

Cela **respecte la contrainte** et offre une valeur différenciée honnête par rôle.

---

## 3. Wireframe (structure de la page)

### Mobile / tablette (< 1024 px) — colonne unique

```
┌────────────────────────────────────────────┐
│ HEADER  ─────────────────────────0-█────30s │   sticky, fond bordereau, hauteur 56 → 64 px
│ [Brand]  ·  [nav…]          [avatar+]       │
├────────────────────────────────────────────┤
│ SALUT ──                            [badge]│   "Bonjour {prénom} 👋" + rôle
│ Sous-titre contextuel de la semaine        │
├────────────────────────────────────────────┤
│ ┌ BANDEAU VERROU (participant if weekValid) │
│ │ ✓ Semaine validée — X atelier·s confirmé │
│ └ Douchette: bouton Valider/Dévalider     │
├────────────────────────────────────────────┤
│ ┌ HEATMAP (cœur)                  ────────  │  (voir §5) — la piece maîtresse
│ │ [legend jours/intensité] réutilisation    │
│ └ CTA bas « Renseigner mes dispo »        │
├────────────────────────────────────────────┤
│ ┌ CREneau recommandé (cœur, mentor/admin) │  RecommandationCard réutilisée
│ │ badge #1 · Lun 09:00–11:00 · ≈14 · 88% │
│ │ [Planifier]                             │
├────────────────────────────────────────────┤
│ KPI row (attendus) : dispo | à venir | grp │
├────────────────────────────────────────────┤
│ ┌ PROCH[DEFINING] ateliers (2 up to 5)     │
│ │  Mar 14 · Titre Série · 12 pigeons       │
│ AFFAIRE: liste horizontale sur lg+,         │   └ CTA "voir tout"
├────────────────────────────────────────────┤
│ ┌ ACTIVIT odadata Récente (temporal)        │
│ │  acceptation demande · validation dispo   │
├────────────────────────────────────────────┤
│ ┌ RÉSUMÉ PERSONNEL · progression / actions │
│  "complétez vos dispo pour la S27"          │
└────────────────────────────────────────────┘
```

> On mobile, ordre = **1.** header **2.** KPI-lite **3.** CTAs critique **4.** heatmap **5.** rec **6.** ateliers **7.** activité. La heatmap reste au-dessus du pli sur desktop (grid 12 → heatmap 8 col, résumé perso 4 col sur lg).

---

## 4. Architecture de la page (arborescence de composants)

```
dashboard/page.tsx            → composition (fetch en lecture seule rassemblés)
├─ DashboardShell / grid      → ü organisation responsiv
├─ RoleBadge / HeaderBlock    → prénom, sous-titre semaine, badge (réutilise StatCard? no → maigre)
├─ WeekValidationBanner       → réutilisation toggler Valider/Dévalider (logique existante, props only)
├─ PersonalHeatmapCard       → réutilise HeatmapCard (scheduling-views) recalibrée "personnelle"
├─ CohortHeatmapCard         → mentor/admin uniquement : réutilise HeatmapCard (cohorte) `highlightCell`
├─ RecommendationCard        → mentor/admin uniquement, réutilise RecommendationCard (+ onPlan)
├─ KpiStrip                   → 4× StatCard (icon, label, value, footnote)
├─ UpcomingWorkshopsCard      → nouvelle, liste 2→5, badge série, CTA "voir tout"
├─ ActivityFeedCard           → nouvelle, dernière mutations (came timezone)
└─ PersonalSummaryCard        → nouvelle, checklist perso actionnable
```

Règles :
- Aucune écriture : pas de mutate de disponibilité ici (boutons renvoient à `/disponibilites`).
- Pas de nouveau fetch écriture ; on lit les endpoints déjà consommés ($2).
- On **réutilise** `StatCard`, `HeatmapCard`, `RecommendationCard`, `Badge`, `Button`, `Card*`, `DayNames`. On évite tout doublon.

---

## 5. Composants (réutilisation vs nouveau)

| Composant | Origine | Rôle dans le redesign |
|---|---|---|
| `HeatmapCard` | `scheduling-views` réutilisé | heatmap cohorte (mentor/admin) **et** heatmap perso (membre) |
| `RecommendationCard` | `scheduling-views` réutilisé | créneau recommandé cohorte (mentor/admin) |
| `StatCard` | `ui/stat-card` réutilisé | rangée KPI |
| `Badge` / `Button` / `Card*` | `ui/*` | riche |

Nouveaux (dans `src/components/`) :
- `dashboard/upcoming-workshops.tsx`
- `dashboard/activity-feed.tsx`
- `dashboard/personal-summary.tsx`
- `dashboard/week-banner.tsx` (wrapper — réutilise la logique Valider/Dévalider existante verrou)
- `dashboard/kpi-row.tsx`

Le **KPI-lite mobile** peut être porté par `StatCard` en haut, sans bloc séparé.

---

## 6. Justification UX (pourquoi cette structure)

1. **Modèle du "cockpit"** : la heatmap au centre répond au brief « élément principal », tout en restant dans les données légalement disponibles selon le rôle. On respecte la contrainte en affichant au membre sa heatmap perso (vraies données) au lieu d'une heatmap de cohorte inaccessible.
2. **≤ 30 s de lecture** : sections courtes, valeurs chiffrées d'abord, un seul CTA primaire par bloc, ratios et progressions réutilisent la saturation déjà codée dans `cellStyle` (0→total par couleur).
3. **Actions filamentées** : chaque bloc a un CTA unique au gabarit ≥ 44 px (boutons, liens à zone large). Aucun nouveau toggle.
4. **Accessibilité AA** : headers hiérarchiques (h1→h2→h3), `caption` sr-only sur heatmap (déjà), contrastes des popover color ensuring, focus `focus-visible` tailwind par défaut, `aria-live` sur bandeau verrou.
5. **Rôles honnêtes** : on ne fabrique pas de données non autorisées ; le membre voit son propre état, le mentor l'état cohorte. La hiérarchie "membre < mentor < admin" est reflétée sans dupliquer.
6. **Consistacy avec le design system** : mêmes tokens (`--color-accent`, success/warning/error), mêmes composants `stat-card`, `heatmap`, `card`. Zéro nouvelle dependency.

---

## 7. Plan d'implémentation (pas à pas, sans touch² aux API)

1. Création de `src/components/dashboard/` : `week-banner.tsx`, `kpi-row.tsx`, `upcoming-workshops.tsx`, `activity-feed.tsx`, `personal-summary.tsx`.
2. Réécriture de `src/app/(app)/dashboard/page.tsx` :
   - settle `const role = session.user.role`.
   - load : `/api/availabilities` + `/api/availabilities/validate` + `/api/workshops` + `/api/groups` (tous) ; **si** mentor/admin → + `/api/mentor/scheduling`.
   - fusionner chaotique des données, gérer les 403 (membre) par branche.
3. Réutilisation : `HeatmapCard` (perso/cohort), `RecommendationCard` (cohort).
4. Ajout du `h̀yset KPI` : Membre → [Dispo, Ateliers, Groupes, Progression]; Mentor → remplace "Progression" par "Cohorte est jointe".
5. Bandeau verrou semainé : réutiliser props `weekValidated`/`weekValidatedAt`, bouton navigate vers `/disponibilites` (pas d'écriture inline).
6. Wire responsive : grid à 5 casses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-12` + placement heatmap/rec/ateliers dans la grille.
7. Accessibilité : titres hiérarchiques, `aria-label`, espacement (≥44 px), `prefers-reduced-motion` respecté.

---

## 8. Checklist dev

- [ ] Aucune modification d'API, de route, de logique métier ni des schémas Prisma.
- [ ] La page compile : `tsc --noEmit` vert, `next build` vert.
- [ ] Conscience du rôle : membre = perso, mentor/admin = cohorte (heatmap+rec), admin = + validation.
- [ ] `HeatmapCard` & `RecommendationCard` réutilisés (pas réécrits).
- [ ] Rangée KPI = `StatCard`.
- [ ] Chaque bloc a UN CTA culminant, zones ≥ 44 px.
- [ ] Grid responsif sur 5 casses (base, sm, md, lg, xl/2xl).
- [ ] WCAG AA : caption sr-only heatmap conservé, contraste `--success/--warning/--error`, focus visible, lang `fr-FR`.
- [ ] Chargement par bloc (skeleton/simple) et non plein écran spinner (sauf session initiale).
- [ ] États vides gérés (aucune dispo → CTA "ajouter", pas de rec → texte de guidance).
- [ ] Pas de nouvelle dependency installée.

---

## 9. Critères d'acceptation

- [ ] Le dashboard affiche en priorité la heatmap dans le viewport sur desktop (lg+).
- [ ] Un membre ne voit pas de heatmap/rec cohorte (branche role conditionnelle, pas de données fantômes).
- [ ] Les KPIs reflètent des valeurs calculées (compter/s); pas de zéro codé en dur.
- [ ] Le bandeau "Semaine validée" s'affiche uniquement si `weekValidated` true (admin/membre).
- [ ] Les 3 (membre) et 4-5 (mentor/admin) sections sont consommables en ≤ 30 s.
- [ ] Tailles des zones : aucune cible interactive < 44 px (44 min on dd).
- [ ] Pas de régression : les liens "Planifier / Renseigner / Voir les ateliers" restent accessibles (éteint la nav existante).
- [ ] Build et typecheck passent.
- [ ] Menu voting nav : enable états interactifs (picker de test : clavier ≤ 44 × 44).