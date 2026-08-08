# Dashboard Administrateur — Centre de Commandement

Rôle : Principal Product Designer / UX Architect / Design System Lead.
Périmètre : `src/app/(app)/admin/page.tsx` + `src/components/admin-scheduling.tsx` (+ composants réutilisables existants).
Contraintes strictes : aucune modification du backend, Prisma, APIs, calculs, routes. Uniquement réorganisation / amélioration / hiérarchisation de l'interface, en conservant l'identité graphique et le design system.

---

## 0. Point de départ (audit du code réel)

**Backend consommé (aucune modif)** :
- GET `/api/admin/scheduling?window=&groupId=` → `{ totalMembers, totalAvailabilities, minHour, maxHour, heatmap[], heatmapSmoothed?, recommendation[{day,startTime,endTime,available,percent}], referenceTimezone, groupName, groups:[{id,name,activityCount,memberCount}] }`
- GET `/api/admin/groups` → `[{ ...group, members:[{ hoursPerWeek, reliability, weekValidated, weekValidatedAt, user }], totalHours }]` — permet de cibler les `hoursPerWeek===0` (n'a pas renseigné) et `weekValidated:false`.

### Fil d'implémentation actuelle
`admin/page.tsx` (server) → `PageTitle` + `<SchedulingDashboard/>` (client) ; `admin-scheduling.tsx` : filtre groupe, `AttendanceNudgeCard`, bandeau 3 cartes (Membres actifs / Créneaux / Meilleur créneau), `HeatmapCard`, `RecommendationCard`.

**Contraintes internes identifiées dans le code :**
1. `recommendation[i].available` est un float (ex. 12.33) → à arrondir pour l'affichage.
2. `recommendation` a 6 entrées mais seulement `percent`/`available` : pas de `confidence` → **le score de confiance est déductible** (`percent * (available / totalMembers)`) côté client, sans backend.
3. `heatmap` ne stocke que `count`/jour/heure → la vue "membres de la cellule" est hors API (à économiser : tooltip détaillé OK, liste membres = *hors portée* sans backend ⇒ documenté comme limite et contourné).
4. `groups` dans scheduling ne donne que `id,name,activityCount,memberCount` ; les `members[].{hoursPerWeek,reliability,weekValidated}` viennent de `/api/admin/groups` (2ᵉ fetch client). → permet "qui n'a pas renseigné" et "groupes incomplets".

---

## 1. Audit détaillé

| Axe | Constat | Impact |
|---|---|---|
| **Hiérarchie** | `Meilleur créneau` est relégué dans un bandeau de 3 colonnes, DESSOUS du groupe-select et du nudge ; la heatmap est sous lui. L'œil n'est pas conduit au choix n°1 d'abord. | Majeur |
| **KPI** | « `Créneaux renseignés` » = total année/global, ambigu (pas "cette semaine"). `Membres actifs` sans contexte de fiabilité. Aucun ratio (dispo/envoyés), aucun lien vers une action. | Élevé |
| **Créneaux recommandés** | Liste simple. N°1 apparaît *deux fois* (bandeau + liste). Pas de score, durée, confiance visibles. `available` est flottant affiché cru. `Planifier` OK mais sans complément ("Voir la cohorte"). | Majeur |
| **Heatmap** | Lisible mais interaction limitée : `title` only (pas de contenu riche accessible ESA), aucune action à la cellule (regrouper une session). Contraste du cirlus var clair/obscur OK. | Moyen |
| **Données → décision** | Pas de section "Insights" : rien ne dit « groupe Backend à 42 % », « 8 membres n'ont pas renseigné », « risque de semaine ». Les nombres sont bruts, sans interprétation. | Majeur |
| **Responsive** | `sm:grid-cols-3` → dégrade sur 2/1 col mais heatmap `min-w-[560px]` scroll horizontal sur mobile ; pas de layout adapté ; bandeau `best` passe en pleine largeur sans valeur. | Moyen |
| **Accessibilité** | Toggles/réf ring sur meilleur créneau (`focus` OK) ; la heatmap n'a pas de `role`/`aria-label` interactif hormis `caption` sr-only ; pas de skip pour les données secondaires. | Moyen |
| **Performance** | Un seul fetch scheduling + nudge (2ᵉ fetch ateliers) ; `load` relancé à chaque `windowHours`/`groupId` (re-render complet). Sans mémoïsation. | Faible |

---

## 2. Score UX — **72/100**
Le « Meilleur créneau » est difficile à localiser (no index décisionnel), pas de "pourquoi", pas d'accès aux risques, insights absents. Navigation claire dès l'accès mais décisionnel.

## 3. Score UI — **78/100**
Propre, tokens cohérents, `StatCard`/`Card` via établ. Manque : hiérarchie visuelle, scores/anneaux, espacements décisionnels, densité optimisée.

## 4. Score Product Design — **68/100**
Dashboard de *vérification* plutôt que de *décision*. Les bons blocs existent mais sont désordonnés et sans état si « affaire à faire » (rien indique « qui manque » / « quel groupe est à relancer »).

---

## 5. Nouvelle architecture du Dashboard (ordre décisionnel)

```
┌──────────────────────────────────────────────────────────────┐
│ Header : PageTitle + actions (Gérer groupes · Nouvel atelier) │
├──────────────────────────────────────────────────────────────┤
│ 1. DECISION PRINCIPALE   : Recommandation #1 (grande carte)   │
├──────────────────────────────────────────────────────────────┤
│ 2. KPI (4 max, actionnables)                                  │
├──────────────────────────────────────────────────────────────┤
│ 3. HEATMAP (cœur) + interactions                              │
├──────────────────────────────────────────────────────────────┤
│ 4. RECOMMANDATIONS (classement, réséau)
├──────────────────────────────────────────────────────────────┤
│ 5. INSIGHTS  (risques, groupes, retardataires) + quick-actions│
├──────────────────────────────────────────────────────────────┤
│ 6. ACTIVITÉ / STATS GROUPS  (liste aide à la décision)      │
└──────────────────────────────────────────────────────────────┘
```

Philosophie : chaque bloc répond à une question, chaque ligne est une invitation agird.

---

## 6. Wireframe amélioré (Desktop ≥ 1280)

```
[Salut % prenom · ADMIN badge]            [Gérer groupes] [Nouvel atelier]
────────────────────────────────────────────────────────────────────────
  ┌ BEST SLOT — carte pleine largeur, fond accent/8 ring-accent/40 ────┐
  │  Mardi 18:00 → 20:00                      score 92/100 confidence  │
  │  ≈ 14 présent·es attendus · 68% de ta cohorte   [Créer un atelier]│
  │  Le meilleur compromis disponibilité × assiduité.                 │
  └────────────────────────────────────────────────────────────────────┘
────────────────────────────── ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
┌ Dispo moy. ┐┌ Ateliers ┐┌ Groupes ┐┌ Σ heures   ┐   (StatCard)
│  62%       ││ 5 à venir ││ 4/6 ok  ││ 340 h/sem  │
└────────────┘└──────────┘└────────┘└────────────┘
 HEATMAP [Lun..Dim] x [8..20] — cellule hover → tooltip dyn; click → lignes
 LEGENDE gris 0→N   [filtre groupe]
 RECOMMANDATIONS (6) [..1h][2h][3h][4h]
  #1 Mardi 18–20  [barre 68%] ≈14 · conf 92 · [Planifier]
  #2 ...
 INSIGHTS
  ⚠️ 3 membres n'ont pas renseigné leurs dispo — [Relancer]
  ⚠️ Backend 42% renseigné — [Voir le groupe]
  💡 Jeudi soir = 78% disponible — [Créer un atelier]
 GROUPES (liste compacte)
  Backend  · 12 membres · 340h · 72% renseigné · fiabilité 84%
```

---

## 7. Composants à créer

1. `BestRecommendationHero` — la fiche n°1, carte météo (score, conf, barre, CTA).
2. `InsightCard` + `InsightsList` — génère des insights côté client (à partir de scheduling + admin/groups) avec quick-action.
3. `CohortKPIGrid` — 4 `StatCard` + anneaux/barres (ratio dispo, fiabilité moyenne).
4. `MemberAtRisk` / `NoAvailabilityList` — "qui n'a pas renseigné" (aggregate côté client sur groups.members).
5. `RecoRow` compact — amélioration de la présentation des recommandations (barre, dur, score).
6. `Tooltip` réutilisable compatible clavier (si absent du DS : vérifier être générique).
7. `MetricDonut` / `MiniProgress` — visualisation ratio en anneau (Tailwind/ShadCN pures, pas de changer l'identité).

## 8. Composants à modifier

1. `admin-scheduling.tsx` — **réécrire la composition** : fusionner KPI + Hero + reco + insights + groupes.
2. `RecommendationCard` (scheduling-views) — enrichir chaque entrée : `available` arrondi, durée, confiance (déduite), état `selected`.
3. `HeatmapCard` — ajouter : `aria-label` par lignes, tooltip accessible (remplacement du simple `title`), cellule `button` avec `aria-haspopup` si interaction, et **highlight clair**. Sans penser les données (limite API).
4. `admin/page.tsx` — ajouter la seconde ressource client (`/api/admin/groups`) à charger en parallèle via la composition du client (pas server).

---

## 9. Design Tokens concernés (inchangés, réutilisés)
- `--accent` (azure) → action, focus, `focus-visible`.
- `--success` (vert) → disponible / renseigné / OK. **Nouvel usage sémantique**.
- `--warning` (orange) → attention / groupes incomplets / non-validés.
- `--error` (rouge) → conflit / rien renseigné / conflit.
- `--muted`, `--muted-foreground`, `--border`, `--card`, `--background`, `--ring`.
- La TTU des Teinte des jours (`DAY_HUES`) conserve le sens actuel du heatmap DOS-NOT; on ne change que l'accessibilité/contraste.

---

## 10. Responsive Layout (5 breakpoints)

| Cas | Layout |
|---|---|
| Desktop ≥1280 | grid 12 : Hero (span 12) / KPI (4) / Heatmap (8) + Reco (4) / Insights (12 stacked) |
| Laptop ≥1024 | Mem types, KPI 4 colonnes, Heatmap pleine largeur + reco en 2 col |
| Tablette 768→1023 | KPI 2×2 ; Hero full ; Reco `Grid md:grid-cols-2` ; heatmap scroll |
| Mobile →639 | Hero compact, KPI 2×2 horizontal, heatmap survivor-culescroll vertical dédié, recos empilées full width, boutons 44px |
| Mobile →480 | pareil + `sticky` CTA du Hero en bas (tactile ≥44px) |

Toutes les zones cliquables ≥ 44×44 ; défilement ligne vertical fine ; pas de vue "réduite" en desktop.

---

## 11. Mobile Layout (concret)
- Header compact (PageHeader existing OK), brand visible.
- `BestRecommendationHero` gagne : badge top-1 grind — rendu pleine largeur, CTA primary big (h-11).
- KPIs : `grid-cols-2` avec `font-heading text-2xl`, footnotes 2 lignes max.
- Heatmap : basculer vers une **timeline par jour** (réutilise `mobile-weekly-timeline` exist)
- Reco : cartes pleine largeur CTA 44px.
- Insights : pleine largeur, texte 14px min, chaque action un lien/button ≥44px.
- `bottom` sticky bar viable sur mobile pour "Créer un atelier".

---

## 12. Checklist d'implémentation

- [ ] Aucune modification backend / APIs / Prisma / calculs / routes.
- [ ] Hero du meilleur créneau en DA `accent`, 1ᵉ position, champ visible.
- [ ] KPI : (1) ratio dispo `%`, (2) ateliers à venir, (3) groupes OK, (4) mas. — chacun actionnable ou avec résumé.
- [ ] Pliage les KPI inutiles/Mouelle (si ratio calculé).
- [ ] Heatmap : état focus (aria-label/force visible), tooltip accessible (au-delà de `title`), contraste cellules ≥ contrastes nécessaire.
- [ ] `available` arrondi partout ; pas de float en UI.
- [ ] Reco : 6 rangées avec score/barre/CTA ; opéring `window` conservé.
- [ ] Insights générés côté client depuis /scheduling + /admin/groups (aucune API tocuée).
- [ ] Liste "qui n'a pas renseigné" + action `Relancer` (→ redirige /admin/groups, pas de backend).
- [ ] Groupes stats : fiab, masse horaire, rattrapage via groups data.
- [ ] Grid responsive 5 casques + mobile sticky CTA.
- [ ] Lighthouse contrast AA, focus visible, touch 44px, ARIA ages.
- [ ] `useMemo`/`useCallback` pour éviter rerenders sur data-enseignement.
- [ ] TSC + `next build` verts.

---

## 13. Critères d'acceptation

- [ ] En <10 s l'admin identifie : meilleur créneau (hero), taux de renseignement (KPI), alertes (insights).
- [ ] En <30 s il peut : « Créer un atelier » (hero), filtrer cohorte (select), accéder à la relive des retardataires.
- [ ] Chaque carte répond à une question et propose une action ; les nombres bruts sont remplacés par ratios/badges/irl.
- [ ] Recommendations utilitaires : classement, disponibilité, score, nb membres, durée, confiance, action.
- [ ] Heatmap bénéficie d'interactions accessibles (hover + focus) sans changer le backend.
- [ ] Mobile = layout adapté (timeline, KPI 2cols, CTA sticky), pas de simple scale.
- [ ] WCAG AA respecté (contraste, focus, aria, touch).
- [ ] Tous les KPI inutiles supprimés ; seuls des KPI « décisionnels ».
- [ ] tsc --noEmit & next build verts.

---

## 14. Limite assumée (sans backend)
La liste des membres d'une cellule heatmap (heatmap = counts uniquement) et un « score de confiance » natif ne sont pas livrables via l'API actuelle. → le confiance est *déduite* (`percent` pondéré par fiabilité moyenne par groupe), la « liste membres d'une cellule » est remplacée par l'action `Créer un atelier à ce créneau` (qui passe par le flow existant). Toute exigence nécessitant ces données doit être réévaluée ou nécessitera une (future) évolution API hors périmètre.