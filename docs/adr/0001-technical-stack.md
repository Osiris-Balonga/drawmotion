# ADR 0001 — Stack technique

Date : 2026-08-25  
Statut : accepté

## Contexte

DrawMotion est une application web cliente, centrée sur la webcam, l'inférence locale et un moteur Canvas. Elle ne requiert ni serveur applicatif ni base de données pour la version 1.

## Décision

- React 19 et TypeScript strict pour l'interface ;
- Vite 8 pour le développement et le build statique ;
- Tailwind CSS 4.3 pour les utilitaires et tokens ;
- shadcn/ui avec Base UI, style `new-york`, sources possédées par le projet ;
- MediaPipe Tasks Vision dans un Web Worker ;
- Canvas 2D natif à deux couches ;
- Zustand pour l'état UI uniquement ;
- Vitest, Testing Library et Playwright pour les tests ;
- Vercel pour previews HTTPS et production.

## Conséquences

Le moteur de dessin, l'interprétation gestuelle et la caméra restent indépendants de React. Les assets MediaPipe sont hébergés localement. Toute nouvelle dépendance doit réduire une complexité mesurable et être justifiée dans sa pull request.

