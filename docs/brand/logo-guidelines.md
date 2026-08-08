# HashCode Sync — Logo Guidelines

## Concept

Le symbole HashCode Sync représente **deux modules synchronisés** connectés par un nœud central.

- Les deux barres verticales symbolisent deux entités, deux systèmes ou deux cohortes.
- Le losange central représente le point de synchronisation, la coordination et la connexion.
- L'ensemble évoque subtilement la lettre **H** sans la représenter littéralement.

## Signification

| Élément | Signification |
|---------|---------------|
| Barre verticale gauche | Une entité / un module / une cohorte |
| Barre verticale droite | Une entité / un module / une cohorte |
| Losange central | Le point de synchronisation, la coordination, le lien |
| Forme géométrique | Précision, technologie, modularité |
| Lignes épurées | Simplicité, modernité, professionnalisme |

## Palette officielle

| Usage | Couleur | Hex |
|-------|---------|-----|
| Primaire | `#6C3BFF` | Violet HashCode |
| Fond sombre | `#0B1023` | Navy profond |
| Blanc | `#FFFFFF` | Blanc pur |

Le logo principal utilise **une seule couleur** : `#6C3BFF`.

## Variantes

### 01 — Logo principal
Symbole + HashCode Sync — Couleur primaire `#6C3BFF`
Pour fonds clairs ou sombres.

### 02 — Logo blanc
Symbole + HashCode Sync — Blanc `#FFFFFF`
Pour fonds sombres uniquement (`#0B1023`, `#151A2E`).

### 03 — Logo sombre
Symbole + HashCode Sync — `#0B1023`
Pour fonds clairs uniquement (`#FFFFFF`, `#F5F5FA`).

### 04 — Symbole seul
Losange + barres — `#6C3BFF`
Pour favicon, avatar, sidebar, mobile.

### 05 — Symbole blanc
Losange + barres — `#FFFFFF`
Pour fonds sombres.

## Tailles minimales

| Format | Minimum |
|--------|---------|
| Logo complet | 120 px de largeur |
| Symbole seul | 16 px |
| Favicon | 16 × 16 px |

En dessous de 16 px, utiliser uniquement le favicon dédié.

## Clear space

Maintenir une zone de protection égale à **la hauteur du losange central** autour du logo.

Aucun texte, bordure ou élément graphique ne doit empiéter sur cette zone.

## Fonds autorisés

- `#FFFFFF`
- `#0B1023`
- `#151A2E`
- `#6C3BFF` (sur des surfaces claires ou sombres avec contraste suffisant)

## Fonds interdits

- Rouge, orange, vert, jaune
- Dégradés multicolores
- Images complexes sans overlay
- Fond transparent pour le logo complet (seulement pour le symbole)

## Utilisation dans l'application

| Contexte | Variante | Taille |
|----------|----------|--------|
| Login / Register | Symbole + nom | 120–160 px |
| Dashboard header | Symbole seul | 24–32 px |
| Sidebar compact | Symbole seul | 20–24 px |
| Mobile nav | Symbole seul | 24 px |
| Favicon | Symbole seul | 16–32 px |
| Loading / Splash | Symbole seul | 48–64 px |
| Email | Logo complet | 200 px max |

## Règles favicon

- Ne jamais utiliser le mot "HashCode Sync" dans le favicon.
- Simplifier le symbole si nécessaire pour conserver la lisibilité à 16 × 16 px.
- Prévoir `favicon.svg` pour les navigateurs modernes.
- Prévoir `favicon.ico` pour la compatibilité legacy (généré à partir du SVG).
- Prévoir `apple-touch-icon.svg` pour iOS.
- Prévoir les icônes PWA : 192 × 192 et 512 × 512.

## Fichiers disponibles

```
/public
  /brand
    hashcode-sync-logo.svg       # Logo principal (primaire)
    hashcode-sync-logo-dark.svg   # Logo sombre (#0B1023)
    hashcode-sync-logo-light.svg  # Logo blanc (#FFFFFF)
    hashcode-sync-icon.svg        # Symbole seul (primaire)
    hashcode-sync-icon-light.svg  # Symbole blanc
    hashcode-sync-favicon.svg     # Favicon simplifié

  /icons
    favicon.svg                   # Favicon moderne
    apple-touch-icon.svg          # Icône iOS

  favicon.ico                     # À générer depuis le SVG
```

## Interdictions

❌ Modifier les proportions du symbole
❌ Étirer ou déformer le logo
❌ Changer les couleurs officielles
❌ Ajouter des ombres, dégradés ou effets 3D
❌ Utiliser le logo sur des fonds à faible contraste
❌ Remplacer le symbole par une icône générique
❌ Ajouter un slogan dans le logo
❌ Utiliser le logo complet en dessous de 120 px de largeur

## Test de reconnaissance

Le symbole doit rester identifiable :
- à 16 px (favicon)
- à 24 px (sidebar)
- à 32 px (mobile nav)
- à 48 px (loading)
- à 64 px (splash screen)

## Test de mémorisation

Le symbole doit être suffisamment distinctif pour ne pas être confondu avec :
- un calendrier
- une icône de synchronisation générique
- GitHub, Dropbox, Notion, Linear, Slack

## Philosophie

> "Simple enough to recognize. Distinct enough to remember. Flexible enough to scale."

Le logo ne doit pas essayer de raconter toute l'histoire de HashCode Sync. Il doit créer un symbole suffisamment fort pour devenir progressivement l'identité visuelle de HashCode.

**Priorité :**
1. Reconnaissance
2. Simplicité
3. Distinction
4. Lisibilité
5. Cohérence
6. Esthétique
