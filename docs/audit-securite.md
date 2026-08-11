# Audit de Sécurité — HashCode Sync

Réalisé : revue statique du code source (apps API, auth, middleware, upload, Prisma).
Périmètre : `src/app/api/**`, `src/lib/**`, `src/middleware.ts`, `src/components/**`, `prisma/schema.prisma`, config.
Méthode : revue de code manuelle (SAST léger), focus OWASP Top 10 / ASVS L1-L2.

---

## Résumé exécutif

L'application est **globalement saine** : l'authentification est gérée par Better Auth, presque toutes les routes vérifient le `userId` de session (bonne résistance aux IDOR), et les entrées sont typées/validées dans la plupart des routes. Aucun sink XSS direct, aucune injection SQL (Prisma), aucun secret committé.

Cependant, nous avons identifié **1 vulnérabilité haute** (suppression de fichiers arbitraires côté serveur), **2 vulnérabilités moyennes** (upload basé uniquement sur le MIME, session cookies non durs en prod), et plusieurs **éléments de durcissement** importants pour une mise en production.

| # | Sévérité | Titre | Localisation |
|---|---|---|---|
| A1 | 🔴 Haute | Path traversal → suppression de fichier arbitraire | `src/lib/uploads.ts` + `admin/groups/[id]/route.ts` (PATCH coverImage) |
| A2 | 🟠 Moyenne | Upload : validation MIME client-spoofable, pas de magic-byte | `src/app/api/upload/route.ts` |
| A3 | 🟠 Moyenne | Cookies de session sans `Secure`/config explicite en prod | `src/lib/auth.ts` (config minimale) |
| A4 | 🟡 Basse | Reset-password : lien loggé dans la console | `src/lib/auth.ts` `sendResetPassword` |
| A5 | 🟡 Basse | `dev-server.log` tracké dans git | repo racine |
| A6 | 🟡 Basse | Headers de sécurité / CSP non définis | `next.config.ts` |
| A7 | 🟡 Basse | Contrôle d'accès global via cookie uniquement (+ défense en profondeur manquante) | `src/middleware.ts` |
| A8 | 🟡 Basse | La présence d'un atelier peut être marquée pour un userId quelconque (fiabilité polluable) | `admin/workshops/[id]/attendance/route.ts` |
| A9 | 🟢 Info | `NEXT_PUBLIC_BETTER_AUTH_URL` manquante dans `.env` (fallback localhost) | `.env` |

> **Statut de remédiation** : A1, A2, A3, A4, A5, A6, A8 ✅ **corrigés et clôturés** (commits `a4deaa9`, `10d4ee3`, `2d65292` — détails par section). Restent ouverts : **A7** (middleware) et **A9** (variable d'env) — à traiter au déploiement.

---

## Détail des vulnérabilités

### 🔴 A1 — Path traversal → suppression de fichier on Linux

**Fichiers** : `src/app/api/admin/groups/[id]/route.ts:55-72` + `src/lib/uploads.ts`.

> ✅ **CLÔTURÉ** — commit `a4deaa9`. `removeUpload` n'utilise que le `basename` et vérifie que le chemin résolu reste dans `public/uploads` (double garde), empêchant toute traversée (`/uploads/../../.env`).

Un manager/admin d'un groupe peut PATCH `coverImage` avec une valeur commençant par `/uploads/` (check `coverImage.startsWith("/uploads/")`). `removeUpload` exécute ensuite :

```ts
await unlink(join(process.cwd(), "public", relativeUrl));
```

Avec `relativeUrl` = `/uploads/../../.env` → `path.join` normalise en `public/.env`, puis `unlink` supprime **n'importe quel fichier** dans l'espace de travail du serveur (`.env`, sources, uploads d'autres groupes).

**Impact** : sous une vm/proc desservante aux privilèges du processus Next, un attaquant manager peut supprimer `.env` (secrets), casser le service, ou supprimer les uploads des autres groupes. Un `PATCH` réinitialisant `coverImage` après avoir posé le chemin malveillant déclenche la suppression.

**Correction recommandée** : restreindre `coverImage` à un nom de fichier simple (UUID) sans `/`, ou valider que le chemin résolu reste dans `public/uploads/` via `path.resolve` + `startsWith`, et/ou supprimer par `relativeUrl.split("/").pop()` (basename).

---

### 🟠 A2 — Upload : validation du type basée sur le MIME déclaré

**Fichier** : `src/app/api/upload/route.ts`.

> ✅ **CLÔTURÉ** — commit `a4deaa9`. Le contenu réel est vérifié par **magic bytes** (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF…WEBP`, GIF) et doit correspondre au MIME déclaré ; fichier stocké sous `randomUUID.ext`.

Le type est validé sur `file.type` (MIME fourni par le client, spoofable). L'extension est dérivée de ce même MIME. Un fichier avec un contenu réellement HTML/JS mais présenté comme `image/png` sera accepté et stocké dans `public/uploads/` (servi statiquement par Next, même origine). Même sans SVG autorisé, la combinaison pourrait permettre un stockage de contenu exploitable.

**Correction** : lire les **magic bytes** (signatures PNG `89504E47`, JPEG `FFD8`, GIF `GIF8`, WebP `RIFF`+`WEBP`) et refuser sinon ; optionnellement desconter `image/svg+xml` de la whitelist.

---

### 🟠 A3 — Cookies de session sans `Secure` explicite

**Fichier** : `src/lib/auth.ts`.

> ✅ **CLÔTURÉ** — commit `a4deaa9`. `baseURL` défini, `trustedOrigins` configurées (env), `advanced.useSecureCookies` en production, expiration 7 jours.

La config Better-auth ne définit ni `session` (expiresIn, cookies secure), ni `trustedOrigins`, ni rate limit. En production derrière HTTPS, le flag `Secure` du cookie de session doit être explicite (Better-auth le fait via `BETTER_AUTH_URL` HTTPS/d`advanced.secureCookies`), sinon risque de vol de session en clair. À confirmer avec la configuration de déploiement.

**Correction** :
```ts
session: { cookieCache: { enabled: true }, expiresIn: 60*60*24*7 },
advanced: { secureCookies: true, database: ... },  // selon l'environnement
```
Toujours configurer `trustedOrigins` sur le domain de prod.

---

### 🟡 A4 — Reset de mot de passe loggé dans la console

**Fichier** : `src/lib/auth.ts` `sendResetPassword`.

> ✅ **CLÔTURÉ** — commits `10d4ee3`/`2d65292`/`08e18a4`. L'envoi passe par le mailer (`Resend` puis fallback SMTP) ; le `console.log` restant dans `src/lib/mailer.ts:28` n'existe **qu'en dev** (`NODE_ENV !== "production"`) et sans transporteur configuré.

```ts
console.log(`[HashCode Sync] Lien de réinitialisation pour ${user.email} : ${url}`);
```
Correct dans le dev (pas de SMTP), mais en prod, expose le lien ⇅ dans les logs serveur. À déporter derrière SMTP en production sinon supprimer le log.

### 🟡 A5 — `dev-server.log` commité

Fichier de logs Next.js suivi dans git (contenu actuel neutre, mais des logs futurs peuvent y fuiter). À supprimer du tracking (ligne dedans `.gitignore`).

> ✅ **CLÔTURÉ** — commit `a4deaa9`. Fichier supprimé du tracking, `*.log` ajouté au `.gitignore`.

### 🟡 A6 — Absence de Content-Security-Policy / headers sécurité

`next.config.ts` : `poweredByHeader: false` déjà bon. Ajouter dans `headers()` statiquement sur tout : `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`.

> ✅ **CLÔTURÉ** — commit `a4deaa9`. CSP + `nosniff` + `X-Frame-Options: DENY` + Referrer-Policy + Permissions-Policy appliqués sur toutes les routes dans `next.config.ts`.

### 🟡 A7 — Middleware : session cookie seulement

Le middleware redirige les non-connectés ; la vérification d'autorisation **serveur** (`/admin`, `/mentor`) repose sur les pages/API, les bonnes pratiques ont déjà géré `redirect("/forbidden")`. Renforcer avec l'info de session validée (au lieu de présence du cookie seulement) quand possible.

> ⏳ **OUVERT** — à traiter (défense en profondeur).

### 🟡 A8 — Présence marquable pour n'importe quel user

`admin/workshops/[id]/attendance/route.ts` : un createur d'atelier peut POST un `userId` quelconque sans vérifier qu'il a un rôle dans l'atelier. → fausse fiabilité bayèse (données polluées), pas une fuite de données. Ajouter une vérif que le `userId` est bien participant (ou membre) de l'atelier avant upsert.

> ✅ **CLÔTURÉ** — commit `a4deaa9`. La présence n'est acceptée que pour un participant réel de l'atelier (`attendance/route.ts` + `attendance/bulk/route.ts` : `allowedUserIds` filtré sur les participants).

---

## Points vérifiés — Négatifs (non vulnérables) ✅

- **IDOR** : `availabilities/[id]` vérifie `userId` ; `groups/[id]/membership` vérifie `groupId_userId` ; `notifications/[id]` & `read-all` scoped au session.user. ✅
- **Workshops** : PATCH/DELETE contrôlent `createdBy` (propriété). ✅
- **Admin groups** : `requireManager` oblige role admin ou membership manager (bonne garde). ✅
- **Join requests** : objet, `groupId` matché + statut whitelisté. ✅
- **XSS frontal** : aucun `dangerouslySetInnerHTML`/`eval`/`innerHTML` renvoyé. React échappe par défaut. ✅
- **SQLi** : tous les accès via Prisma (paramétré). Pas de template string SQL. ✅
- **Secrets** : `.env` ignoré par Git ✓ (~ OK) ; `BETTER_AUTH_SECRET` = 130 caractéros ✓ ; `.env.example` ne contient que des placeholders ✓.
- **Upload** : nom de fichier `randomUUID` + extension whitelistée (anti-traversal du nom du fichier d'origine). ✅ (mais voir A2).
- **Validation input** : dates, heures (regex `/\d\d/`), énum whitelistes (type activité, statut). ✅

---

## Checklist de remédiation (priorité)

1. 🔴 **A1** : corriger `removeUpload`/PATCH `coverImage` (basename / resolved path interior `public/uploads`). ✅ **clôturé** (`a4deaa9`)
2. 🟠 **A2** : magic-byte validation dans `/api/upload`. ✅ **clôturé** (`a4deaa9`)
3. 🟠 **A3** : forcer `secureCookies` + `trustedOrigins` en prod dans Better-auth. ✅ **clôturé** (`a4deaa9`)
4. 🟡 **A6** : headers sécurité via `next.config.ts`. ✅ **clôturé** (`a4deaa9`)
5. 🟡 **A5** : retirer `dev-server.log` du tracking. ✅ **clôturé** (`a4deaa9` + `.gitignore`)
6. 🟡 **A8** : valider le `userId` participant avant upsert de présence. ✅ **clôturé** (`a4deaa9`)
7. 🟡 **A4** : envoi du reset-password par mail (SMTP/Resend), log dev uniquement. ✅ **clôturé** (`10d4ee3`/`2d65292`/`08e18a4`)
8. 🟡 **A7** : rôle check enrichi dans le middleware (session validée). ⏳ **ouvert**
9. 🟢 **A9** : définir `NEXT_PUBLIC_BETTER_AUTH_URL` dans l'env de déploiement. ⏳ **ouvert**

Acceptance avant déploiement : les points 🔴/🟠 (A1, A2, A3) sont corrigés et clôturés ; restent **A7** et **A9** (durcissement / configuration de déploiement).

---

Sévérité comptée selon impact/présentation : 🔴 Haute · 🟠 Moyenne · 🟡 Basse/Info. Revue statique — une validation dynamique (DAST) compléterait cet audit.