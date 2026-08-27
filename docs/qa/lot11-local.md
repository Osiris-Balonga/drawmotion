# Lot 11 — préparation locale du 27 août 2026

Statut : préparation réalisée, **livraison non validée**.

## Changements

- Checklist manuelle v1 avec treize parcours, environnement/SHA/preuves à renseigner.
- Version locale `1.0.0-rc.1`, changelog et limites explicites dans le README.
- Inventaire des licences déclarées des dépendances directes ; notices et licence projet encore à finaliser.
- Procédure de PR, QA, promotion, rollback, tag annoté et publication séparée.
- Workflow de tag créant uniquement un brouillon GitHub Release ; aucun déploiement ni changement de visibilité.

Le guide de livraison a été utilisé pour séparer validation et promotion.
Les fichiers applicatifs, seuils de gestes, caméra, dépendances et lockfile
n'ont pas été modifiés. La version RC ne constitue pas une release publiée.

## Vérifications exécutées

- Installation avec lockfile figé et scripts désactivés : déjà à jour.
- Prettier : réussi.
- TypeScript et build Vite : réussis.
- Budgets : JS 655 597 octets bruts / 204 348 gzip, CSS 72 640 octets ; identiques au lot 10.
- Empreintes des sept assets MediaPipe : vérifiées.
- Workflow YAML parsé ; syntaxe des blocs shell vérifiée avec Bash.
- Métadonnées : sept scénarios en mémoire, dont rejet RC, version divergente, documents ou changelog absents.
- Gardes Git : quatre scénarios simulés, dont refus d'un tag léger ou hors HEAD de main.
- Création de release : deux scénarios simulés, brouillon avec tag préexistant et conservation d'une release existante.

Les tests du workflow ont utilisé des fonctions Git/GitHub factices, sans
appel d'écriture distant. Ils ne valent pas une exécution GitHub Actions.
La suite applicative complète n'a pas été relancée pour ces changements de
documentation, version et workflow ; ses résultats précédents restent dans
[le lot 10](./lot10-local.md). Rejouer `pnpm validate` avant tout push.

## À traiter avant livraison

Les cases de [QA v1](./v1.0.0.md) restent ouvertes. En particulier : vraie
webcam, preview HTTPS, CI distante, licence du projet, notices de redistribution
et essai de retour arrière. Le périmètre actuel de l'export PNG (viewport
visible, pas document complet) doit aussi être accepté ou corrigé.

Aucun push, merge, tag, déploiement ou changement de visibilité n'a été fait.
