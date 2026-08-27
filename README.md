# DrawMotion

DrawMotion est une démonstration technologique web de dessin 2D contrôlé par les gestes de la main devant une webcam.

## Statut

Prototype fonctionnel en cours de préparation pour une démo publique et une
publication open source. Le dépôt reste privé pour le moment ; aucune release
publique n'est annoncée comme disponible. Le travail est découpé dans
[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

Version candidate locale : `1.0.0-rc.1`. La [checklist de livraison](./docs/qa/v1.0.0.md)
reste à valider sur une vraie webcam et une preview HTTPS avant la v1.0.0.
Les [notes de version](./CHANGELOG.md) décrivent les capacités et limites actuelles.

## Principes

- traitement vidéo local dans le navigateur ;
- tutoriel illustré en cinq missions, rejouable, progression validée par les gestes ;
- réglages et commandes utilisables aussi à la souris et au clavier ;
- aucune donnée biométrique, vidéo ou télémétrie distante ;
- chaque capacité est livrée par une pull request dédiée.

## Stack utilisée

React 19, TypeScript strict, Vite 8, Tailwind CSS 4.3, shadcn/ui Base Nova avec
Base UI, MediaPipe Tasks Vision dans un Worker, Canvas 2D, Vitest, Playwright
et axe-core. L'état d'interface utilise les hooks React ; les ressources vidéo
et le rendu restent impératifs.

## Lancer en local

Avec Node 24 et pnpm 11 :

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Ouvrir l'adresse affichée par Vite, puis activer la caméra en cliquant sur son
aperçu. Pour dessiner : déplacer l'index, pincer pour tracer, relâcher pour
lever le stylo, fermer le poing pour gommer. Le signe paix (index et majeur
levés) maintenu ouvre les commandes près de la main, hors missions de dessin
du tutoriel. Les petits boutons du dock ne se pilotent pas par pincement.

Le dock et les commandes partagent couleurs, épaisseurs, styles de trait et
précision. La couleur personnalisée HEX/RGB est réservée au dock. La navigation
de toile propose zoom et déplacement avec Espace + glisser. Les commandes
restent disponibles à la souris et au clavier, mais le tracé actuel nécessite
une main détectée : ce n'est pas encore un mode complet de dessin à la souris.

Le PNG exporte la zone visible de la toile au zoom courant. Dézoomer et
recentrer pour inclure tout le dessin ; les traits hors champ ne sont pas
automatiquement inclus. Le document n'est pas sauvegardé au rechargement.

## Tests

`pnpm test` lance les tests unitaires, de composants et d'intégration.
Chaque groupe peut être exécuté séparément avec `pnpm test:unit`,
`pnpm test:components` ou `pnpm test:integration`.
`pnpm test:e2e` lance les parcours Chromium ; `pnpm test:all` lance tout.
Les contrôles d'accessibilité se lancent seuls avec
`pnpm test:e2e accessibility.spec.ts`, les parcours gestuels avec
`pnpm test:e2e gestures.spec.ts`.
Le smoke test de vraie inférence sous CSP se lance avec
`pnpm test:e2e security.spec.ts` (vidéo factice, modèle/WASM réels).

Compatibilité, confidentialité, diagnostics et vérifications avant publication :
[guide de compatibilité](./docs/COMPATIBILITY.md) et [sécurité](./SECURITY.md).

Installation navigateur, mode surveillance, conventions et limites :
[stratégie de tests](./docs/TESTING.md).

## Livraison et licences

La [procédure de livraison](./docs/RELEASE.md) sépare préparation, QA, promotion
et publication. Aucun push ne publie automatiquement une GitHub Release.

La licence open source de DrawMotion n'est pas encore choisie : ne pas
présenter le code comme déjà disponible sous licence libre. Les dépendances
conservent leurs propres licences ; [l'inventaire tiers](./docs/THIRD_PARTY.md)
documente les vérifications restantes avant redistribution publique.
