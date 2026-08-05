# HashCode Sync – PRD (MVP)

## Informations

- **Nom :** HashCode Sync
- **Version :** MVP
- **Type :** Scheduling & Cohort Coordination System

---

# Vision

Créer une plateforme permettant de coordonner facilement les disponibilités des membres afin d'organiser les ateliers, mentorats et événements de HashCode.

---

# Problème

Aujourd'hui la coordination se fait via :

- WhatsApp
- Messages privés
- Appels
- Sondages

Conséquences :

- Difficulté à trouver un créneau
- Perte de temps
- Faible participation
- Mauvaise organisation

---

# Objectifs

- Centraliser les disponibilités
- Trouver automatiquement le meilleur créneau
- Organiser les ateliers
- Réduire les conflits d'horaires
- Améliorer la participation

---

# Utilisateurs

## Membre

- Gérer ses disponibilités
- Voir ses ateliers
- Recevoir les notifications

## Mentor

- Programmer un mentorat
- Voir les participants
- Gérer ses sessions

## Administrateur

- Voir toute la cohorte
- Planifier les ateliers
- Consulter les statistiques

---

# Fonctionnalités MVP

## Authentification

- Inscription
- Connexion
- Déconnexion
- Mot de passe oublié

---

## Disponibilités

- Calendrier hebdomadaire
- Ajouter un créneau
- Modifier un créneau
- Supprimer un créneau

---

## Dashboard Admin

- Heatmap des disponibilités
- Nombre de membres disponibles
- Créneaux recommandés
- Statistiques

---

## Ateliers

- Créer un atelier
- Modifier un atelier
- Supprimer un atelier
- Assigner les participants

---

## Notifications

- Nouvel atelier
- Modification d'un atelier
- Annulation
- Rappel avant la session

---

# Smart Scheduling

Le système doit :

- Analyser les disponibilités
- Compter les membres disponibles
- Détecter les conflits
- Recommander automatiquement le meilleur créneau

---

# Pages

- Login
- Register
- Dashboard Membre
- Dashboard Mentor
- Dashboard Admin
- Disponibilités
- Ateliers
- Profil
- Paramètres

---

# Base de données

## Users

- id
- firstname
- lastname
- email
- password
- role

---

## Availabilities

- id
- userId
- day
- startTime
- endTime

---

## Workshops

- id
- title
- description
- startAt
- endAt
- createdBy

---

## Participants

- id
- workshopId
- userId
- status

---

# Workflow

```
Connexion
      ↓
Dashboard
      ↓
Ajouter ses disponibilités
      ↓
Calcul automatique
      ↓
Créneau recommandé
      ↓
Création d'un atelier
      ↓
Notification des membres
```

---

# Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- ShadCN UI

## Backend

- Next.js API
- Prisma

## Base de données

- PostgreSQL

## Auth

- Better Auth

## Déploiement

- Docker
- VPS

---

# Roadmap

## MVP

- Authentification
- Disponibilités
- Smart Scheduling
- Dashboard Admin
- Ateliers
- Notifications

---

## V2

- Google Calendar
- Outlook
- Statistiques avancées
- Export

---

## V3

- IA de recommandation
- Prédiction des présences
- Planification automatique
- Application mobile

---

# Critères de succès

- Un membre peut gérer ses disponibilités.
- L'administrateur voit toute la cohorte.
- Le système recommande un créneau.
- Un atelier peut être planifié.
- Les participants sont notifiés.

---

# Hors MVP

- Application mobile
- IA avancée
- Multi-organisations
- Paiements
- Gestion financière
- Visioconférence intégrée