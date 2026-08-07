# Audit UX/UI — HashCode Sync

> Audité le 07 août 2026. Étendu aux 10 écrans (topbar, cartes, heatmap, recommandations, formulaires, dashboard, profil, notifications, ateliers, groupes, admin, mentor, éditeur). Philosophie : **améliorer**, jamais refaire.

---

## 1. Structure — 7,5/10

Base saine : grille `max-w-6xl/5xl/3xl`, espacement `space-y-6`, padding `px-4 py-8` cohérent sur la majorité des pages.

| Problème | Gravité | Impact |
|---|---|---|
| Largeur incohérente entre pages « jumelles » (`dashboard`/`admin` = `max-w-6xl`, `profil` = `3xl`, `nouvel atelier` = `xl`, `groupes` = `5xl`) | Mineur | Moyen |
| Indentation cassée sur `ateliers/[id]` (bloc Participants, lignes 211–281) | Cosmétique | Faible |

---

## 2. Hiérarchie visuelle — 7,5/10

Aéros parcours ✓ : titre `font-heading 2xl` → sous-titre `muted-foreground` → cartes. KPIs en `font-heading text-3xl` bien mis en avant.

| Problème | Gravité | Impact |
|---|---|---|
| Le KPI « Meilleur créneau » (cœur du produit) est une stat morte sans action | Majeur | Élevé |
| 6 nav-items à poids égal dans le header, Dashboard pas hiérarchisé | Mineur | Faible |

---

## 3. Palette — 6/10

Identité `brand-navy #1a1a2e` / `brand-pink #e94560`, cohérente. **UN VRAI BUG** :

| Problème | Gravité | Impact |
|---|---|---|
| **`text-error` / `text-success` utilisés mais INEXISTANTS dans globals.css** (workshops-manager:133, ateliers/[id]:174, availability-manager:193+203) → aucune couleur générée, feedback invisible | **Critique** | Élevé |
| Pas de tokens `success` / `warning` | Mineur | Moyen |
| Contrast `muted-foreground` (#6b6d85) / background (#f5f5fa) ≈ 4,5:1 (limite) | Mineur | Faible |

---

## 4. Typographie — 8/10

Échelle `font-heading` saine (2xl page → 1g carte → base). Deux écueils :

| Problème | Gravité | Impact |
|---|---|---|
| `text-[10px]` (heatmap, timestamp notif) trop petit | Mineur | Moyen |
| Titres de cartes parfois `text-lg` vs base `text-base` (incohérences) | Cosmétique | Faible |

---

## 5–6. Espacement & Cartes — 7,5/10 & 7/10

- Espacement régulier, respirable ✓.
- Cartes `rounded-xl ring-1 ring-foreground/10` sans ombres lourdes : **très bien**.
- Footer manuel `border-t pt-3` dans `WorkshopCard` au lieu du composant `CardFooter` → unification.
- Pas de `cursor:pointer` / hover sur les cartes actionnables (recommandations, KPI).

---

## 7. Icônes — 8/10

lucide, `size-4/5` cohérent, `size-3` nourri. MAIS même `text-error` cassé sur `Trash2Icon` → icône corbeille invisible.

---

## 8. Boutons — 8/10

`Button` shadcn/cva complet (default/outline/secondary/ghost/destructive/link + focus/disabled/active). Deux retouches :

| Problème | Gravité | Impact |
|---|---|---|
| `size sm` = h-8 (32px) < cible tactile 44px (WCAG 2.5.5) sur mobile | Mineur | Moyen |
| Bouton deleste = ghost icône avec `text-error` cassé, sans variant `destructive` | Mineur | Moyen |

---

## 9. Formulaires — 7,5/10

Labels `<Label htmlFor>`, `required`, validation inline. **MAIS** :

| Problème | Gravité | Impact |
|---|---|---|
| Feedback « fin doit être après début » affiché avec `text-error` cassé (availability-manager) → **invisible** | **Critique** | Élevé |
| Bouton « Créer » désactivé sans explication si invalide | Mineur | Moyen |
| Select des fuseaux horaires (350+) sans recherche | Mineur | Moyen |

---

## 10. Heatmap — 6/10 *(le différenciateur)*

| Problème | Gravité | Impact |
|---|---|---|
| **Créneaux recommandés NON surlignés sur la matrice** (seulement listés en dessous) | Mineur-Majeur | Élevé |
| Valeurs en % affichées dans chaque cellule = bruit visuel | Mineur | Moyen |
| Légende d'intensité fixe `hsl(345)` pink alors que chaque jour a sa teinte → ne correspond qu'au Lundi | Mineur | Moyen |
| `heatmap.find` en boucle O(days×hours×n) | Cosmétique | Faible |
| Pas de `<caption>`/`aria-label` pour le tableau | Mineur | Faible |

---

## 11. Dashboard (membre) — 6,5/10

- Informations utiles visibles en <5 s ? **Non.**
- Ne montre que 2 liens (dispo + ateliers), aucune donnée (prochain atelier, masse-horaire, prochains sessions).
- Proposition : ajouter KPIs (prochain atelier, masse-horaire) + « mes prochains ».

---

## 12. Topbar (réelle, pas sidebar) — 7/10

| Problème | Gravité | Impact |
|---|---|---|
| **Pas d'état actif** (`aria-current` absent, aucun highlight) → on ignore où on est | Mineur | Moyen |
| 6 liens + cloche + profil + logout sur mobile → surcharge/overflow | Mineur | Moyen |

---

## 13. Responsive — 6,5/10

Heatmap `min-w-[560px]` scroll horizontal correct (colonne dates sticky déjà). Topbar et zones tactiles sont les vrais points faibles.

---

## 14. Performance visuelle — 8/10

Peu de redondances. Seul point : double label du couple header (membre + logout).

---

## 16. Design System — 7,5/10

Manque : tokens `success`/`error`, composants `StatCard` & `PageTitle` (dupliqués ~8×).

---

## Score global : **72/100**

---

## 20 améliorations prioritaires (par impact)

1. **Token `success` / `error`** + `--destructive` pour delete — Critique, Élevé
2. **Surligner les créneaux recommandés sur la heatmap** — Élevé
3. **CTA « Planifier » depuis KPI + recommandations** (`/nouvelle atelier` pré-rempli) — Élevé
4. **Dashboard membre : vrai KPIs** (prochain, masse-horaire, prochains) — Élevé
5. **État actif topbar** (`aria-current` + highlight) — Moyen
6. **Topbar responsive** (icônes + burger sur mobile) — Moyen
7. **Zones tactiles h→h-10 sur mobile** — Moyen
8. **`text-[10px]`→11px, valeurs heatmap en `title`** — Moyen
9. **Légende heatmap : échelle neutre unique** — Moyen
10. **Uniformiser `max-w-*`** — Moyen
11. **Composants `StatCard` + `PageTitle`** — Moyen
12. **`aria-invalid` sur champs en erreur** — Moyen
13. **`Trash2` → `variant="destructive"`** — Moyen
14. **`aria-label` sur icônes/select** — Moyen
15. **Combo searchable fuseau horaire** — Moyen
16. **`caption` sr-only heatmap** — Faible-Moyen
17. **Nudge feedback de présence** (liste présent/absent dans KPI) — Moyen
18. **heatmap indexée `Map<day,hour>`** — Faible (perf)
19. **Footer `workshop` → `CardFooter`** — Cosmétique
20. **Uniformiser tailles lucide** — Cosmétique

---

## Ce qu'il NE FAUT PAS toucher

- Palette `brand-navy` / `brand-pink` (identité HashiCode)
- Composant `Button` (cva, états complets)
- Système de cartes `Card` + `ring-1` sans ombres
- Formulaires (labels `for`, required, inline)
- Modèle `Attendance` + estimation bayésienne (cœur du produit)
- `presenceProbability` / `computeMassHours` (réutilisés proprement)
- Structure routes (Server pour statique, client pour dashboards)
- Multi-fuseaux (`REFERENCE_TIMEZONE` + cache Dtf)

---

## Palette effective

| Rôle | Light | Dark |
|---|---|---|
| primary | `#1a1a2e` | `#272a55` |
| accent (marque) | `#e94560` | `#e94560` |
| background | `#f5f5fa` | `#0e0f1e` |
| surface | `#ffffff` | `#1b1c31` |
| border | `#e2e3ee` | `rgb(255 255 255/10%)` |
| muted text | `#6b6d85` | `#9a9cb3` |
| secondary | `#e7e8f2` | `#1d1f3d` |
| destructive (danger) | oklch rouge | oklch rouge |
| **success** | ❌ non défini | ❌ non défini |
| **warning** | ❌ non défini | ❌ non défini |

---

## Design Tokens

- **Radius** : échelle `sm`→`base 0.625rem`→`2xl/4xl` ✓
- **Spacing** : `--card-spacing` (gap fluide emboîté)
- **Boutons** : default `h-8`, sm `h-7`, xs `h-6`, lg `h-9`
- **Ombres** : aucune (volonté, Ring `1px` uniquement)
- **Textes** : titre `2xl semibold`, card `base/lg`, stat `3xl`

---

## Verdict

Fondation **réellement solide**. Les vrais fixes :
1. Deux tokens `error`/`success` inexistants utilisés → feedback cassé (Critique, trivial).
2. Le couple heatmap + urjaction manque d'interprétation immédiate et d'actions.
3. Topbar : état actif absent + surcharge mobile.

Avec ~6 correctifs, triffera à **85/100** sans toucher une pixel d'identité.