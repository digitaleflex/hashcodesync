# Publication & Visibility System — PRD

**Version:** 1.0  
**Date:** 7 septembre 2026  
**Deadline:** 24 septembre 2026

## 1. Problème

La création d'un atelier ne doit pas automatiquement signifier sa publication publique.

## 2. Modèle V1

### Lifecycle
- DRAFT
- PUBLISHED
- CANCELLED
- COMPLETED

### Visibility
- INTERNAL
- PUBLIC

## 3. Règles

- Un contenu DRAFT n'est visible publiquement par personne.
- PUBLIC + PUBLISHED peut être affiché dans Program Center.
- INTERNAL reste réservé aux utilisateurs autorisés.
- CANCELLED doit conserver l'historique sans accepter de nouvelles inscriptions.
- COMPLETED reste consultable selon les règles de rétention.

## 4. Permissions

- Admin : contrôle complet.
- Mentor : création selon autorisation.
- Member : aucune publication publique directe.

## 5. Issues associées

- HCS-301 — Ajouter lifecycle officiel — **19 sept.**
- HCS-302 — Ajouter visibility INTERNAL/PUBLIC — **19 sept.**
- HCS-303 — Mettre à jour les contrôles d'autorisation — **20 sept.**
- HCS-304 — Créer workflow de publication admin — **21 sept.**
- HCS-305 — Vérifier annulation et capacité — **22 sept.**
- HCS-306 — Tests d'isolation PUBLIC/INTERNAL — **23 sept.**
- HCS-307 — Validation finale — **24 sept.**

## 6. Definition of Done

Une activité ne peut apparaître publiquement que si sa visibilité et son lifecycle l'autorisent explicitement.
