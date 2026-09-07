# HashCode Program Center — PRD

**Version:** 1.0  
**Date:** 7 septembre 2026  
**Statut:** Draft  
**Deadline:** 18 septembre 2026

## 1. Vision

Le Program Center est la porte d'entrée publique vers les programmes et activités HashCode.

## 2. Utilisateurs

- Visiteur public.
- Utilisateur inscrit.
- Membre HashCode.
- Mentor.
- Administrateur.

## 3. Parcours principal

Visiteur → `/program` → programme de la semaine / atelier → détails → inscription.

## 4. Pages V1

### `/program`
Landing et accès aux activités principales.

### `/program/this-week`
Programme officiel de la semaine.

### `/program/upcoming`
Activités futures.

### `/program/workshops`
Catalogue filtrable des ateliers publics.

### `/program/workshops/[slug]`
Page détaillée avec date, description, capacité et inscription.

## 5. Données publiques

Une activité publique expose uniquement les informations nécessaires :

- titre ;
- description publique ;
- date et heure ;
- format ;
- capacité/statut ;
- instructions d'inscription.

Aucune disponibilité individuelle, donnée privée de groupe ou information administrative ne doit être exposée.

## 6. Requirements

- Responsive.
- Lecture rapide.
- SEO de base.
- URLs stables.
- États : loading, empty, cancelled, completed.
- Filtrage des contenus PUBLIC uniquement.

## 7. Issues associées

- HCS-201 — Concevoir modèle de données public — **12 sept.**
- HCS-202 — Construire `/program` — **12 sept.**
- HCS-203 — Construire `/program/this-week` — **13 sept.**
- HCS-204 — Construire `/program/upcoming` — **14 sept.**
- HCS-205 — Construire `/program/workshops` — **15 sept.**
- HCS-206 — Construire détail workshop par slug — **16 sept.**
- HCS-207 — QA responsive et UX — **17 sept.**
- HCS-208 — Validation finale Phase 2 — **18 sept.**

## 8. Definition of Done

Toutes les pages fonctionnent avec des données réelles et aucune donnée INTERNAL n'est accessible depuis les routes publiques.
