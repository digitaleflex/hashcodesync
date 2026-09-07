---
title: "[HCS-405] Ajouter rate limiting aux endpoints publics"
labels: ["p1", "security", "phase-3"]
priority: "P1"
deadline: "2026-09-22"
status: "TODO"
---

# [HCS-405] Ajouter rate limiting aux endpoints publics

## 🎯 Objectif

Protéger les endpoints publics contre abus et automatisation excessive.

## 📌 Contexte

Cette issue fait partie de **HashCode Sync V1.5** et doit respecter le scope freeze défini pour la roadmap du 7 septembre 2026.

## 🔍 Problème à résoudre

L'implémentation doit répondre au besoin identifié sans introduire de duplication inutile ni modifier le Sync Engine existant au-delà de ce qui est nécessaire.

## 📋 Scope

### Inclus
- Travail strictement nécessaire à l'objectif de cette issue.
- Tests pertinents.
- Mise à jour minimale de documentation lorsque nécessaire.

### Exclus
- Fonctionnalités non prévues par la phase actuelle.
- Refactoring massif non indispensable.
- Extensions P2/P3 qui retardent cette issue P1.

## ✅ Critères d'acceptation

- [ ] Les endpoints sensibles sont identifiés.
- [ ] Des limites appropriées sont appliquées.
- [ ] Les réponses de limitation sont cohérentes.
- [ ] Les limites ne bloquent pas abusivement un usage normal.
- [ ] Les règles sont documentées.

## 🛠️ Checklist technique

- [ ] Analyser l'impact sur le code existant.
- [ ] Implémenter la solution côté serveur lorsque la sécurité ou l'intégrité l'exige.
- [ ] Ajouter ou mettre à jour les tests pertinents.
- [ ] Vérifier les cas d'erreur.
- [ ] Vérifier l'autorisation et la confidentialité si applicable.
- [ ] Vérifier le comportement mobile/public si applicable.
- [ ] Documenter toute décision technique importante.

## 🧪 Validation

La validation doit fournir une preuve exploitable : tests, capture de comportement, résultat d'intégration ou revue documentée.

## ⚠️ Risques

- Régression du système existant.
- Introduction d'une incohérence entre PUBLIC et INTERNAL.
- Ajout de complexité inutile.

Toute extension hors scope doit être enregistrée dans le backlog.

## 📅 Deadline

**2026-09-22**

## 🏁 Definition of Done

- [ ] Critères d'acceptation validés.
- [ ] Tests pertinents exécutés avec succès.
- [ ] Aucun défaut P1 connu introduit.
- [ ] Revue terminée.
- [ ] Issue prête à être fermée.
