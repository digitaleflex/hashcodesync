# HashCode Sync — Production Readiness Engineering Specification

**Version:** 1.0  
**Date:** 7 septembre 2026  
**Deadline:** 30 septembre 2026

## 1. Objectif

Préparer HashCode Sync pour une beta contrôlée fiable.

## 2. Priorités techniques

### P1 — Intégrité et sécurité
- Corriger les risques de concurrence sur disponibilités et inscriptions.
- Compléter les indexes composites critiques.
- Centraliser les contrôles d'autorisation.
- Standardiser les erreurs de production.
- Vérifier les frontières PUBLIC/INTERNAL.

### P1 — Observabilité
- Health check.
- Monitoring minimal.
- Logs exploitables.
- Alertes sur erreurs critiques.

### P1 — Tests
- Tests d'intégration des flux critiques.
- E2E : découverte → inscription → participation.
- Tests de capacité/waitlist.
- Tests d'autorisation.

### P1 — Notifications
- Retry contrôlé.
- Tracking des échecs.
- Éviter les échecs silencieux.

## 3. Hors scope immédiat

- PWA offline.
- Push notifications avancées.
- Mobile native.
- ML scheduling.
- Gamification.
- i18n complet.
- Analytics avancés.

## 4. Issues associées

- HCS-501 — Audit frontière données publiques — **8 sept.**
- HCS-502 — Corriger race conditions — **9 sept.**
- HCS-503 — Ajouter indexes critiques — **10 sept.**
- HCS-504 — Standardiser erreurs — **10 sept.**
- HCS-505 — Health checks et monitoring — **11 sept.**
- HCS-506 — Notification retry strategy — **25 sept.**
- HCS-507 — Tests E2E critiques — **26 sept.**
- HCS-508 — Bug reporting beta — **28 sept.**
- HCS-509 — Beta Readiness Review — **30 sept.**

## 5. Gate Beta

Le verdict est l'un des suivants :

- READY
- READY WITH CONDITIONS
- NOT READY

La beta ne démarre que si les risques P1 non résolus sont explicitement acceptés et documentés.
