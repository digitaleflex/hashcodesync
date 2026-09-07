# Public Registration & Participation — PRD

**Version:** 1.0  
**Date:** 7 septembre 2026  
**Deadline:** 24 septembre 2026

## 1. Objectif

Permettre à une personne externe de rejoindre une activité publique sans créer un système parallèle de participants.

## 2. Parcours

Discover → Event Details → Register → Login/Create Account si nécessaire → Confirm → Registered.

## 3. Principes

- Réutiliser le modèle User et le système Participant lorsque possible.
- Ne pas créer un PublicUser séparé sans nécessité démontrée.
- L'inscription doit être atomique.
- La capacité doit être respectée.
- La waitlist doit fonctionner automatiquement.

## 4. États

- REGISTERED
- WAITLISTED
- CANCELLED
- ATTENDED
- NO_SHOW

## 5. Sécurité

- Rate limiting sur endpoints publics.
- Vérification de propriété.
- Validation serveur obligatoire.
- Pas d'exposition de listes complètes de participants.

## 6. Issues associées

- HCS-401 — Définir le flux d'inscription — **20 sept.**
- HCS-402 — Implémenter inscription atomique — **20 sept.**
- HCS-403 — Intégrer capacité et waitlist — **21 sept.**
- HCS-404 — Intégrer auth/create account — **21 sept.**
- HCS-405 — Ajouter protections rate limiting — **22 sept.**
- HCS-406 — Tests concurrence/capacité — **22 sept.**
- HCS-407 — Tests E2E du parcours — **23 sept.**
- HCS-408 — Validation finale — **24 sept.**

## 7. Definition of Done

Un visiteur peut s'inscrire à une activité publique et le système conserve correctement capacité, identité, statut et historique.
