# ADR 0002 — Stratégie Git et livraison

Date : 2026-08-25  
Statut : accepté

## Contexte

Le projet doit progresser par lots révisables et ne jamais apparaître sur GitHub sous la forme d'un unique dépôt applicatif poussé en bloc.

## Décision

- un premier commit direct contient uniquement gouvernance et documentation ;
- toutes les capacités suivantes passent par une branche courte et une pull request ;
- `dev` est la branche d'intégration par défaut ;
- `main` est la branche de production déployée publiquement ;
- les branches courtes ouvrent des PR vers `dev` et conservent leurs commits atomiques par rebase merge ;
- une action refuse toute PR vers `main` dont la tête n'est pas exactement `dev` ;
- les promotions `dev -> main` utilisent un merge commit explicite ;
- les tags de version pointent exclusivement sur `main`.

## Conséquences

Les lots sont séquentiels. Un agent prépare une PR et ne la fusionne qu'avec une autorisation explicite du mainteneur. Les hotfix passent eux aussi par `dev`, puis par la même promotion contrôlée vers `main`. Cette stratégie reprend le modèle éprouvé du dépôt PlotTwist tout en conservant les commits atomiques prescrits pour DrawMotion.
