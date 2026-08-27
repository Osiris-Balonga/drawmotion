# DrawMotion

DrawMotion est une démonstration technologique web de dessin 2D contrôlé par les gestes de la main devant une webcam.

## Statut

Pré-implémentation. Le travail est découpé en lots séquentiels dans [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

## Principes

- traitement vidéo local dans le navigateur ;
- tutoriel gestuel en trois étapes ;
- toile utilisable aussi à la souris et au clavier ;
- aucune donnée biométrique, vidéo ou télémétrie distante ;
- chaque capacité est livrée par une pull request dédiée.

## Stack cible

React 19, TypeScript strict, Vite 8, Tailwind CSS 4.3, shadcn/ui Base Nova avec Base UI, MediaPipe Tasks Vision, Zustand, Vitest et Playwright.

## Tests

`pnpm test` lance les tests unitaires, de composants et d'intégration.
Chaque groupe peut être exécuté séparément avec `pnpm test:unit`,
`pnpm test:components` ou `pnpm test:integration`.
`pnpm test:e2e` lance les parcours Chromium ; `pnpm test:all` lance tout.

Installation navigateur, mode surveillance, conventions et limites :
[stratégie de tests](./docs/TESTING.md).
