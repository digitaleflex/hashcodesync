# HashCode Sync

> **IDENTIFIE. DÉVELOPPE. IMPACTE.**

Plateforme de coordination de cohorte : centralise les disponibilités, recommande les meilleurs créneaux et organise les ateliers/mentorats de la communauté HashCode.

## ✨ Fonctionnalités

- **Authentification** (Better Auth) : inscription, connexion, déconnexion, sessions sécurisées
- **Dashboard** : vue utilisateur, rôle, navigation
- **Disponibilités** *(à venir)* : calendrier hebdomadaire, CRUD des créneaux
- **Ateliers** *(à venir)* : création, planification, participants
- **Smart Scheduling** *(à venir)* : heatmap, recommandation automatique de créneaux
- **Notifications** *(à venir)*

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
```

> Le `.env` est ignoré par git (secret). Utilisez `.env.example` et générez un vrai `BETTER_AUTH_SECRET` en production (ex. `openssl rand -hex 64`).

## 🗄️ Schéma de données

- **User** — compte, rôle (member/mentor/admin), prénom, nom
- **Availability** — créneau hebdomadaire (jour, heure début/fin)
- **Workshop** — atelier / session de mentorat
- **Participant** — inscription à un atelier (invité, accepté, refusé)
- **Notification** — notifications utilisateur

## 🧭 Roadmap

- [x] Fondations (auth, palette, dashboard)
- [ ] Gestion des disponibilités
- [ ] Dashboard administrateur (heatmap, recommandations)
- [ ] Ateliers & participants
- [ ] Notifications
- [ ] Smart Scheduling
- [ ] V2 : Google/Outlook Calendar, stats avancées

## 📜 Scripts utiles

| Script | Description |
|---|---|
| `npm run dev` | Serveur de développement (http://localhost:3000) |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `start.bat` | Lancement automatique (Docker + deps + migrations + dev) |