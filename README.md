# HashCode Sync

> **IDENTIFIE. DÉVELOPPE. IMPACTE.**

Plateforme de coordination de cohorte : centralise les disponibilités, recommande les meilleurs créneaux et organise les ateliers/mentorats de la communauté HashCode.

## ✨ Fonctionnalités

### Authentification
- Inscription, connexion, déconnexion, sessions sécurisées
- Mot de passe oublié / réinitialisation
- Rôles : membre, mentor, administrateur
- Profil : prénom/nom, fuseau horaire, changement de mot de passe

### Disponibilités
- Calendrier hebdomadaire : ajout / suppression de créneaux (`HH:mm`)
- Validation (format, heure de fin, chevauchements)
- Disponibilités par **groupe** et **activité** (réservées aux membres du groupe)

### Smart Scheduling
- Heatmap (24 h × 7 j) d'intensité de disponibilité
- Recommandation automatique des meilleurs créneaux (algorithme d'optimisation d'intervalles, fenêtre réglable 1-4 h)
- Conversion multi-fuseaux vers un fuseau de référence (`Africa/Porto-Novo` par défaut)

### Groupes & Activités
- Création de groupes, gestion des activités (atelier, conférence, lab, autre)
- Demande d'accès, acceptation/refus, rôles (membre / manager), heures/semaine
- Dashboard admin/mentor de gestion

### Ateliers & Mentorat
- Création, édition, suppression (réservé au créateur)
- Inscription / désinscription des participants (invité, accepté, refusé)
- Dashboard mentor pour suivre la cohorte et planifier

### Notifications
- Nouvel atelier, modification, annulation, participant, groupe
- Marquer comme lu / tout lire

## 🧱 Stack

| Couche | Techno |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, ShadCN UI (base-ui) |
| Backend | Next.js API Routes |
| Base de données | PostgreSQL 16 (Docker), Prisma ORM |
| Authentification | Better Auth |
| UI / Design | Palette HashCode — bleu nuit `#1a1a2e` · rose `#e94560` |

## 🚀 Démarrage rapide (Windows)

> Prérequis : **Docker Desktop** (pour la base PostgreSQL) et **Node.js 20+**.

**Option 1 — Automatique :** double-clique sur **`start.bat`**. Il s'occupe du conteneur Docker, des dépendances, des migrations et lance le serveur.

**Option 2 — Manuel :**

```bash
# 1. Base de données (première fois uniquement)
docker run -d --name hashcode-postgres \
  -e POSTGRES_USER=hashcode \
  -e POSTGRES_PASSWORD=hashcode123 \
  -e POSTGRES_DB=hashcodesyncdb \
  -p 5433:5432 postgres:16
# puis, aux lancements suivants :
docker start hashcode-postgres

# 2. Variables d'environnement
copy .env.example .env     # puis édite .env

# 3. Dépendances
npm install

# 4. Migrations
npx prisma migrate deploy

# 5. Lancer le serveur
npm run dev
```

Ouvre ensuite **http://localhost:3000**.

## 🔐 Configuration

Copiez `.env.example` vers `.env` et renseignez :

```env
DATABASE_URL="postgresql://hashcode:hashcode123@localhost:5433/hashcodesyncdb"
BETTER_AUTH_SECRET="<secret long et aléatoire>"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
# Fuseau de référence de la cohorte (optionnel, par défaut Africa/Porto-Novo)
REFERENCE_TIMEZONE="Africa/Porto-Novo"
```

> Le `.env` est ignoré par git (secret). Utilisez `.env.example` et générez un vrai `BETTER_AUTH_SECRET` en production (ex. `openssl rand -hex 64`). Sans SMTP configuré, le lien de réinitialisation du mot de passe est affiché dans la console du serveur.

## 🗄️ Schéma de données

- **User** — compte, rôle (member/mentor/admin), prénom, nom, fuseau horaire
- **Group** / **GroupMember** / **GroupJoinRequest** / **GroupActivity** — équipes, membres (rôles, heures/semaine), demandes d'accès et activités propres
- **Availability** — créneau hebdomadaire (jour, début/fin), lié à un groupe/activité
- **Workshop** — atelier / session de mentorat
- **Participant** — inscription à un atelier (invité, accepté, refusé)
- **Notification** — notifications utilisateur

## 🧭 Roadmap

- [x] Fondations (auth, palette, dashboard)
- [x] Gestion des disponibilités (y compris par groupe/activité)
- [x] Dashboard administrateur (heatmap, recommandations)
- [x] Groupes & activités
- [x] Ateliers & participants
- [x] Notifications
- [x] Smart Scheduling (+ multi-fuseaux)
- [ ] V2 : Google/Outlook Calendar, stats avancées, export

## 📜 Scripts utiles

| Script | Description |
|---|---|
| `npm run dev` | Serveur de développement (http://localhost:3000) |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `start.bat` | Lancement automatique (Docker + deps + migrations + dev) |