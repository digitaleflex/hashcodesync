# HashCode Sync V1.5 — Product Repositioning PRD

**Version:** 1.0  
**Date:** 7 septembre 2026  
**Statut:** Draft à valider  
**Deadline phase documentaire:** 11 septembre 2026

## 1. Décision produit

HashCode Sync évolue d'un outil interne de synchronisation des disponibilités vers une plateforme opérationnelle en deux couches :

1. **Sync Engine interne** : disponibilités, groupes, Smart Scheduling, ateliers, mentorat et administration.
2. **HashCode Program Center public** : découverte des programmes, consultation de l'agenda et inscription aux activités publiques.

Le moteur existant est considéré comme un actif à stabiliser. Les nouvelles fonctionnalités ne doivent pas modifier inutilement son cœur.

## 2. Problème

Le système actuel sait organiser et planifier des activités, mais il ne permet pas au public de découvrir facilement ce qui se passe chez HashCode ni de rejoindre les activités ouvertes.

## 3. Objectifs V1.5

- Exposer une offre publique claire.
- Permettre la découverte du programme hebdomadaire et des ateliers.
- Permettre la publication contrôlée d'activités.
- Permettre l'inscription publique sans exposer les données internes.
- Préserver la cohérence du Sync Engine.

## 4. Hors périmètre

- Application mobile native.
- Gamification.
- IA/ML avancé.
- Gestion complète de salles et équipements.
- Multilingue.
- Réseau social communautaire.

## 5. Architecture produit

### Public
`/program/*` → découverte et inscription aux contenus PUBLIC.

### Membre
`/dashboard/*` → espace personnel et participation interne.

### Mentor
`/mentor/*` → sessions et suivi.

### Admin
`/admin/*` → publication, planification et pilotage.

## 6. Critères de succès

- Un visiteur comprend l'offre HashCode en moins de 60 secondes.
- Les activités publiques sont visibles sans connexion.
- Les données internes ne sont jamais exposées.
- Une inscription publique est traçable de bout en bout.

## 7. Issues associées

- HCS-101 — Valider le périmètre V1.5 — **7 sept.**
- HCS-102 — Geler les fonctionnalités hors scope — **7 sept.**
- HCS-103 — Définir la frontière PUBLIC/INTERNAL — **8 sept.**
- HCS-104 — Valider l'architecture de navigation — **8 sept.**

## 8. Definition of Done

Le repositionnement est approuvé, documenté et utilisé comme référence pour les PRD suivants.
