# ADR 0002 — Stratégie Git et livraison

Date : 2026-08-25  
Statut : accepté

## Contexte

Le projet doit progresser par lots révisables et ne jamais apparaître sur GitHub sous la forme d'un unique dépôt applicatif poussé en bloc.

## Décision

- un premier commit direct contient uniquement gouvernance et documentation ;
- toutes les capacités suivantes passent par une branche courte et une pull request ;
- `main` est la branche d'intégration protégée ;
- `production` est la seule branche déployée publiquement ;
- les PR utilisent le squash merge et des contrôles GitHub Actions requis ;
- les tags de version pointent exclusivement sur `production`.

## Conséquences

Les lots sont séquentiels. Un agent prépare une PR mais ne la fusionne pas. Les hotfix partent de `production` et sont ensuite resynchronisés vers `main`.
