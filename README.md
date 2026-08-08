# HashCode Sync

Plateforme de synchronisation des disponibilités et gestion des ateliers pour la cohorte HashCode.

## Architecture

### Services Docker

| Service | Image | Rôle | Ressources |
|---|---|---|---|
| `app` | Build Dockerfile | Next.js 14 + API Routes | 0.25-0.5 CPU, 256-512M RAM |
| `db` | `postgres:16-alpine` | PostgreSQL 16 | 0.5-1 CPU, 512M-1G RAM |
| `backup` | `python:3-slim` | Sauvegardes Backblaze B2 | 0.1-0.25 CPU, 128-256M RAM |

### Réseaux

- **`hashcodesync_net`** : réseau interne Docker pour la communication entre services
- **`proxy`** : réseau externe Traefik pour le routage HTTPS

### Volumes

- **`hashcodesync_postgres`** : données PostgreSQL
- **`hashcodesync_uploads`** : uploads utilisateurs

## Variables d'environnement

### Authentification

| Variable | Description |
|---|---|
| `BETTER_AUTH_SECRET` | Secret pour les sessions Better Auth |
| `BETTER_AUTH_URL` | URL de l'API auth (serveur) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | URL de l'API auth (client) |

### Base de données

| Variable | Description |
|---|---|
| `POSTGRES_USER` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base de données |
| `DATABASE_URL` | URL de connexion PostgreSQL |

### Application

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL publique de l'application |
| `NEXT_PUBLIC_APP_DOMAIN` | Domaine de l'application |
| `NODE_ENV` | Environnement (`production`) |
| `DEFAULT_TIMEZONE` | Fuseau horaire par défaut |
| `TZ` | Fuseau horaire du conteneur |

### Email (Resend)

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Clé API Resend |
| `RESEND_DOMAIN` | Domaine d'envoi |
| `RESEND_FROM` | Expéditeur email |

### Backup (Backblaze B2)

| Variable | Description |
|---|---|
| `B2_APPLICATION_KEY_ID` | ID de la clé d'application B2 |
| `B2_APPLICATION_KEY` | Clé d'application B2 |
| `B2_BUCKET` | Nom du bucket B2 |
| `B2_ENDPOINT` | Point de terminaison B2 |
| `BACKUP_RETENTION_DAYS` | Durée de rétention des backups |

### Notifications backup

| Variable | Description |
|---|---|
| `DISCORD_WEBHOOK_URL` | Webhook Discord pour les notifications |
| `BACKUP_NOTIFY_EMAIL` | Email pour les notifications |
| `BACKUP_NOTIFY_DISCORD` | Activer les notifications Discord (`true`/`false`) |
| `BACKUP_NOTIFY_EMAIL_ON_SUCCESS` | Email seulement en cas d'échec (`false`) |

### CI/CD

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Token GitHub pour les opérations CI |
| `CRON_SECRET` | Secret pour les routes cron |

## Base de données

### Schéma

La base de données contient les modèles suivants :

- **User** : utilisateurs avec rôles (`member`, `mentor`, `admin`)
- **Group** : groupes de travail
- **GroupMember** : membres des groupes
- **GroupActivity** : activités des groupes
- **Availability** : disponibilités des utilisateurs
- **WeeklyValidation** : validations hebdomadaires
- **WeekSnapshot** : snapshots des disponibilités
- **Workshop** : ateliers
- **WorkshopSeries** : séries d'ateliers
- **Participant** : participants aux ateliers
- **Attendance** : présences
- **Waitlist** : liste d'attente
- **Notification** : notifications
- **NotificationPreference** : préférences de notification
- **WorkshopFeedback** : feedbacks post-atelier

### Indexes

- Index sur `User.email` (unique)
- Index sur `Group.createdBy`
- Index sur `Availability.userId`, `groupId`, `activityId`, `day`
- Index sur `WeeklyValidation.userId, weekStart` (unique)
- Index sur `Workshop.createdBy`, `startAt`, `seriesId`
- Index sur `Notification.userId`, `read`
- Et plus...

### WAL Archiving

PostgreSQL est configuré pour archiver les WAL (Write-Ahead Logs) vers Backblaze B2 :

- **`wal_level = replica`**
- **`archive_mode = on`**
- **`archive_timeout = 60`** (toutes les 60 secondes)
- **`max_wal_size = 2GB`**
- **`wal_keep_size = 1GB`**

Cela permet une restauration point-in-time (PITR).

## Sauvegardes

### Stratégie

- **Backup complet** : quotidien à 2h00 du matin
  - Dump PostgreSQL compressé (`pg_dump -F c`)
  - Upload vers Backblaze B2
  - Rétention : 7 jours
- **WAL Archiving** : continu vers B2
  - Permet la restauration point-in-time

### Scripts

| Script | Rôle |
|---|---|
| `backup/run.sh` | Script principal de backup |
| `backup/b2_upload.py` | Upload vers B2 via `b2sdk` |
| `backup/b2_cleanup.py` | Nettoyage des vieux backups |
| `backup/test-backup.sh` | Tests automatisés |

### Notifications

- **Discord** : notification à chaque backup (succès/échec)
- **Email** : seulement en cas d'échec

## Déploiement

### Prérequis

- Docker >= 20.10
- Docker Compose >= 2.0
- Traefik configuré sur le réseau `proxy`
- Backblaze B2 account avec bucket `hashcode-sync`

### Commandes

```bash
# Démarrer tous les services
docker compose up -d

# Voir les logs
docker compose logs -f

# Backup manuel
docker compose exec backup /backup/run.sh

# Tests de backup
bash backup/test-backup.sh

# Arrêter les services
docker compose down

# Rebuilder l'application
docker compose build app
docker compose up -d app
```

### Traefik

L'application est exposée via Traefik avec :

- **Domaine** : `sync.joinhashcode.com`
- **TLS** : Let's Encrypt (certificat automatique)
- **Port interne** : 3000

Labels Traefik dans `docker-compose.yml` :

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.hashcode-sync.rule=Host(`sync.joinhashcode.com`)"
  - "traefik.http.routers.hashcode-sync.entrypoints=websecure"
  - "traefik.http.routers.hashcode-sync.tls.certresolver=letsencrypt"
  - "traefik.http.services.hashcode-sync.loadbalancer.server.port=3000"
```

## Sécurité

### Authentification

- **Better Auth** avec email/password
- **Vérification email** obligatoire
- **Sessions** de 7 jours
- **Cookies sécurisés** en production

### Rôles

| Rôle | Accès |
|---|---|
| `member` | Dashboard, disponibilités, ateliers, groupes, profil |
| `mentor` | Accès membre + `/mentor/*` + vue cohorte |
| `admin` | Accès complet + `/admin/*` |

### Proxy

Le fichier `src/proxy.ts` protège les routes :

- `/dashboard`, `/disponibilites`, `/ateliers`, `/groupes`, `/profil` : authentifié
- `/admin/*` : admin uniquement
- `/mentor/*` : admin + mentor
- `/admin/groupes` : admin + mentor

### Secrets

- Tous les secrets sont dans `.env` (ignoré par git)
- Aucun secret en clair dans `docker-compose.yml`
- `next.config.ts` injecte les `NEXT_PUBLIC_*` via build args

## Performance

### Optimisations appliquées

- **Dashboard consolidé** : 1 seul endpoint API au lieu de 6
- **Cache proxy** : cache court terme sur les sessions (5 min)
- **Cache API** : headers `Cache-Control` sur les listes
- **Bundle** : `optimizePackageImports` pour `lucide-react`
- **Mémoïsation** : `React.memo` sur les composants dashboard
- **Build** : `ignoreBuildErrors` temporaire pour Better Auth types

### Mesures

```bash
# TTFB dashboard
curl -sS -o /dev/null -w "TTFB: %{time_starttransfer}s\n" https://sync.joinhashcode.com/dashboard

# TTFB admin
curl -sS -o /dev/null -w "TTFB: %{time_starttransfer}s\n" https://sync.joinhashcode.com/admin
```

## Issues GitHub

| # | Titre | Status |
|---|---|---|
| #41 | [Perf] Prefetch au survol des liens de navigation | Ouvert |
| #42 | [Perf] Ajouter Suspense sur les cartes du dashboard | Ouvert |
| #43 | [Perf] Ajouter des métriques de navigation réelles | Ouvert |
| #44 | [Backup] WAL archiving + Backblaze B2 + notifications | Ouvert |
| #45 | [DB] Ajouter les indexes composites manquants | Ouvert |

## Admin

- **Email** : `eflexcloud@gmail.com`
- **Rôle** : `admin`
- **Accès** : `/admin/*`

## Contacts

- **Support** : `eflexcloud@gmail.com`
- **Discord** : Webhook configuré pour les notifications backup
- **GitHub** : https://github.com/digitaleflex/hashcodesync

## License

Propriétaire - HashCode © 2026
