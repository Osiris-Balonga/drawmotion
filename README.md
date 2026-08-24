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

React 19, TypeScript strict, Vite 8, Tailwind CSS 4.3, shadcn/ui avec Base UI, MediaPipe Tasks Vision, Zustand, Vitest et Playwright.

