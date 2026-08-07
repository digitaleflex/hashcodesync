# Analyse de marché & stratégie produit — HashCode Sync

> *Document interne. Date : Août 2026.*
> Objectif : positionner HashCode Sync face aux concurrents, dégager un avantage
> différenciant et définir un parcours de monétisation.

---

## 1. Contexte : le problème

La coordination d'une cohorte / communauté (ateliers, mentorats, événements) se
fait encore à la main : WhatsApp, messages privés, sondages, chaînes d'emails.
Conséquences : perte de temps, faible participation, créneaux conflictuels.

HashCode Sync centralise les disponibilités, calcule le meilleur créneau et
organise les ateliers/mentorats. Deux questions pour ce document :

1. **ce marché existe-t-il déjà** (et qui le domine) ?
2. **comment se différencier** pour rendre HashCode Sync unique et monétisable ?

---

## 2. Oui, le marché existe — et il est saturé

On distingue **4 catégories** d'acteurs :

### A. Sondage de disponibilité (gratuits, sans login)
| Outil | Modèle |
|---|---|
| **When2Meet** | grille + heatmap, gratuit, sans compte |
| **Doodle** | grille multi-créneaux, ~15 $/mois, pubs sur le free |
| **WhenAvailable / TallyCal / Morgen Poll / WhenMeet** | UX « moderne », zéro login, heatmap |

### B. Booking 1:1 / lien externe
| Outil | Modèle |
|---|---|
| **Calendly** (~15–40 €/user/mois), **SavvyCal**, **Zeeg**, **Acuity** | vous partagez un lien, le 1:1 choisit un créneau. Ne gère **PAS** les dispo d'une cohorte. |

### C. Planification d'équipe / shifts
| Outil | Modèle |
|---|---|
| **When I Work, Deputy, Connecteam, 7shifts** | plannings de shifts, heures effectuées, pointage RH. Orientés « horaires d'employés », pas « communauté ». |

### D. Planification IA
| Outil | Modèle |
|---|---|
| **Google Calendar (Gemini), Calynq, Clockwise, Reclaim** | lisent vos calendriers et proposent le meilleur créneau automatiquement |

---

## 3. Comparatif fonctionnel

| Fonctionnalité | HashCode | When2Meet | Doodle | Morgen Poll | Calendly/Cal.com | When I Work |
|---|---|---|---|---|---|---|
| Coordination d'une cohorte (groupes/activités) | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Heatmap multi-jours | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ |
| Recommandation auto | ✔ (WIS) | ✔ (max brut) | ✔ (simple) | ✔ (score) | ✔ | ✘ |
| Dispo **par groupe × activité** | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| **Masse-horaire par membre (calculée)** | ✔ | ✘ | ✘ | ✘ | ✘ | ✔ |
| **Probabilité de présence (bayésien)** | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Multi-fuseaux + référentiel | ✔ | ✘ | ✔ | ✔ | ✔ | ✘ |
| Ateliers planifiés + participants | ✔ | ✘ | ✘ | ✘ | ✔ | ✔ |
| Rôles admin/mentor + workflow d'accès | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Zéro login | ✘ (login requis) | ✔ | ✘ | ✔ | ✘ | ✘ |
| Notifications (SMTP) | ✘ (à faire) | ✘ | ✔ | ✘ | ✔ | ✔ |
| Sync Google/Outlook | ✘ (v2) | ✘ | ✔ | ✔ | ✔ | ✔ |

**Lecture clé : aucun acteur ne combine groupe, activité, masse-horaire ET
probabilité de présence.** C'est notre espace libre.

---

## 4. SWOT

### Forces (nos différenciateurs)
1. **Probabilité de présence bayésienne** — pondération + WIS + prior Beta. Aucun concurrent.
2. **Dispo par groupe × activité** (récurrent, par programme) — la réalité d'une communauté, pas un sondage one-shot.
3. **Masse-horaire automatique** par membre.
4. **Multi-fuseaux + fuseau de référence** de cohorte.
5. **Workflow rôles** (admin/mentor) + demandes d'accès + notifications.

### Faiblesses (à corriger)
- Login obligatoire → frein à la participation (When2Meet « sans compte » a l'avantage).
- Pas de sync Google/Outlook.
- Pas de SMTP / email réel.
- UI moins « polie » que les leaders.
- Pas de granules / export.

### Menaces
- Google Calendar + Gemini évoluent vite et sont gratuits.
- Les outils « zéro-login » (When2Meet, Morgen) dominent la strate la plus simple.
- Entrants IA rapides.

---

## 5. Recommandation de positionnement

**NE PAS rivaliser** sur le « sondage simple ». Se positionner sur :

> *« La plateforme de planification de communautés/cohortes : dispo par groupe et
> activité, masse-horaire par membre, et recommandation par probabilité de
> présence. »*

Cibles prioritaires :
- **Bootcamps / écoles de code** (communautés de type HashCode)
- **Associations, clubs étudiants, communautés tech**
- **Coachs & mentors** qui gèrent des groupes de mentorat
- **Cohortes SaaS** / institutions éducatives

---

## 6. Propositions pour rendre HashCode Sync UNIQUE & monétisable

### A. Différenciateurs « cœur » (à développer en priorité)

1. **Présence prédite — notre cri de guerre**
   - « Espérance de présence » par créneau = probabilité d'avoir **au moins Q membres** présents (formule binomiale).
   - Exemple : *« Ce créneau a 87 % de chances de réunir au moins 8 inscrits. »*
   - **Boucle de reedback** : après chaque atelier, l'admin coche présent/absent → `pᵢ` est actualisé (`POST /api/admin/workshops/:id/attendance`, déjà en place).

2. **Masse-horaire comme unité de pilotage**
   - Tableau de pilotage du groupe : cumul h/sem, qui est investi / absent.
   - Avertir quand un membre désengage → « santé d'engagement » (engagement health).

3. **Équité des créneaux (anti-capture)**
   - Proposer plusieurs créneaux qui ne cannibalisent pas toujours les mêmes membres (variante équilibrée du coefficient de Gini).

### B. Aimants d'adoption (V2)
4. **Synchronisation calendrier (Google/Outlook/.ics)** → devenir « le calendrier de la communauté ».
5. **Sondage sans connexion** : un lien sans compte pour les non-membres, rattaché ensuite à un compte → capte l'avantage de When2Meet.
6. **Export CSV/ICS** + bouton « j'exporte le meilleur créneau vers mon agenda ».
7. **Statistiques avancées** : évolution de la participation, taux de présence, top des membres.

### C. Monétisation multi-produits
HashCode Sync peut être **un produit qui déclenche d'autres revenus** pour HashCode :

| Produit | Logique | Modèle |
|---|---|---|
| **SaaS « Communauté »** | abonnement par cohorte/admin | Freemium (1 groupe, ≤50) puis 6–20 €/mois |
| **Outil partenaire de bootcamps** | licences par formation | forfait par cohorte |
| **Abonnement mentor** | mentors pros paient pour gérer leur portefeuille de mentés | 8–15 €/mois + attribution de visibilité |
| **Rapports / API data** | participation, assiduité, déperdition (drop-off) | API / export payant |
| **WhiteLabel** | associations/écoles achètent une instance à leur image | prix par déploiement |

### Z. Écosystème « pro autour de la planification »
- **Paiement des ateliers** (Stripe) → très peu de concurrents cumulent dispo + paiement.
- **Sessions de mentorat payantes** : réservation + paiement en 1 clic.
- **Pack « événementiel »** : billets pour ateliers, réservation de salles, paiement.

---

## 7. Feuille de route (alignée produit/monétisation)

| Itération | Objectif | Monétisation |
|---|---|---|
| **I1 – MVP+ (maintenant)** | Proba présence + masse-hor + notif SMTP + sync Google/.ics + export | Preuve d'usage (gratuite) |
| **I2 – Beta** | Sondage sans login, tableau de pilotage h/sem, stats | Early-adopters / mentors payants |
| **I3 – Paid V1** | Paiement ateliers (Stripe), white label, API | 1 + abonnement Pro |
| **I4 – Scale** | IA de sélection / planification, régie communautaire, marketplace pro | Multi-strand revenue |

---

## 8. Indicateurs à suivre

- **Adoption** : % de membres ayant rempli leur dispo / semaine.
- **Participation** : présence prévue vs observée (validateur du bayésien).
- **Rétention** : utilisateurs actifs / inscrits.
- **Investissement** : masse-horaire moyenne / membre.
- **Satisfaction** : NPS admin/mentors.

---

## 9. Conclusion

Le marché **existe** et est saturé sur la strate « sondage simple ». Mais
**personne ne combine** :

- **groupe × activité récurrente**
- **masse-horaire par membre**
- **probabilité de présence prédictive**
- et un workflow **admin/mentor** dédié aux communautés

C'est exactement **notre angle d'attaque**. On ne se bat pas contre When2Meet
sur la simplicité ; on apporte ce qu'aucun ne fournit : **le pilotage de la
présence continue d'une communauté.**

Prochaines étapes naturelles : le **feedback de présence dans l'UI atelier**,
puis la **synchronisation Google/.ics** pour boucler la boucle.