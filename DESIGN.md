---
name: DrawMotion
description: Une toile gestuelle guidée, précise et immédiatement compréhensible.
---

# Design System: DrawMotion

## Overview

**Creative North Star: "La toile augmentée"**

DrawMotion ressemble d'abord à un outil de dessin calme, puis révèle la vision par ordinateur à travers des preuves utiles : aperçu caméra, squelette de la main, curseur et instruction contextuelle. Dans une pièce intérieure ordinaire, devant un écran d'ordinateur, l'utilisateur doit distinguer sans effort la toile blanche d'une coque sombre qui concentre l'attention.

La composition reprend la clarté de Figma, l'immédiateté d'Excalidraw et la lisibilité technique des démonstrations MediaPipe. Elle rejette explicitement le HUD de science-fiction, le glassmorphism et les décorations néon.

**Key Characteristics:**

- toile blanche dominante et chrome sombre restreint ;
- apprentissage progressif en trois étapes ;
- une seule couleur de marque visible à la fois ;
- états techniques exprimés en langage humain ;
- mouvement réservé au feedback et aux transitions d'état.

## Colors

Stratégie restreinte : neutres légèrement teintés vers le violet, toile blanche, coque presque noire et accent violet réservé aux actions, à la progression et au suivi actif. Les tokens canoniques vivent dans `src/styles/globals.css`.

### Primary

- **Violet de mouvement** `oklch(0.56 0.22 293)` : action principale, outil sélectionné et progression.
- **Anneau de focus** `oklch(0.72 0.16 293)` : focus clavier contrasté sur coque sombre.

### Secondary

- **Vert de suivi** `oklch(0.72 0.16 151)` : détection fiable et réussite.
- **Orange d'attention** `oklch(0.80 0.15 75)` : cadrage imparfait et avertissements récupérables.

### Neutral

- **Coque graphite** `oklch(0.16 0.012 286)` : arrière-plan et barres d'outils.
- **Surface élevée** `oklch(0.22 0.016 286)` : panneaux flottants et rails.
- **Toile blanche** `oklch(0.995 0.002 286)` : surface de dessin uniquement.
- **Encre claire** `oklch(0.97 0.006 286)` : texte principal sur la coque.

**The Rare Accent Rule.** L'indigo-violet ne décore jamais une surface inactive ; sa rareté indique une action ou un état réel.

## Typography

**Display Font:** Geist Variable  
**Body Font:** même famille sans-serif  
**Label/Mono Font:** monospace réservé aux diagnostics de développement

**Character:** compacte, lisible et familière. Les libellés ressemblent à ceux d'un outil de création professionnel, jamais à ceux d'une campagne marketing.

### Hierarchy

- **Display:** absent de l'espace de travail ; aucun titre géant.
- **Headline:** poids 600, réservé à l'autorisation caméra et au tutoriel.
- **Title:** poids 600, utilisé pour l'étape ou le panneau actif.
- **Body:** poids 400, mesure maximale de 70 caractères.
- **Label:** poids 500, casse naturelle et espacement normal.

**The One Family Rule.** Une seule famille sans-serif porte toute l'interface ; la hiérarchie vient de la taille, du poids et de l'espace.

Échelle fixe de produit : `0.75rem`, `0.875rem`, `1rem`, `1.25rem`, `1.5rem`. Le corps reste à `1rem` minimum ; les tailles inférieures sont réservées aux métadonnées et libellés courts.

## Spacing and Motion

L'espacement suit une base de 4 points : `0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, `2rem`, `3rem`. Les groupes proches utilisent 8–12 px ; les zones de travail distinctes utilisent 24–48 px.

Les retours directs durent `120ms` et les transitions d'état `200ms`, avec `cubic-bezier(0.25, 1, 0.5, 1)`. La réduction de mouvement ramène toutes les transitions à un changement instantané perceptible.

## Elevation

Le système est plat par défaut. La profondeur provient d'abord des différences de tons entre coque, rail et panneau. Une ombre courte peut détacher une instruction contextuelle ou un popover, jamais habiller chaque conteneur.

**The State-Only Elevation Rule.** Une ombre signale une superposition ou une réponse à l'interaction ; elle n'est jamais décorative.

## Components

Les composants définitifs seront documentés après leur génération par shadcn/ui avec Base UI. La coque initiale utilisera des boutons compacts, des tooltips concis, un rail vertical, une instruction contextuelle inférieure et un aperçu caméra circulaire.

### Buttons

- **Shape:** coins modérément courbes, jamais bulle surdimensionnée.
- **Primary:** accent plein et texte clair, réservé à l'autorisation caméra et à la validation.
- **Hover / Focus:** changement tonal bref et focus visible contrasté.
- **Ghost:** actions d'outil dans le chrome sombre, avec état sélectionné explicite.

### Navigation

Une barre supérieure compacte contient la marque, annuler, rétablir et exporter. Sous cette barre, la toile blanche occupe toute la surface disponible. Le rail d’outils, l’aperçu caméra et l’instruction contextuelle flottent directement au-dessus de la toile, sans colonne réservée ni cadre périphérique. Tous restent utilisables au clavier et à la souris.

## Do's and Don'ts

### Do:

- **Do** donner la plus grande surface possible à la toile.
- **Do** expliquer chaque état caméra avec une action de récupération.
- **Do** associer icône, texte accessible et feedback visuel aux outils.
- **Do** limiter les transitions ordinaires à 150–250 ms et respecter la réduction de mouvement.
- **Do** confirmer explicitement l'effacement complet de la toile.

### Don't:

- **Don't** construire un HUD de science-fiction rempli de jauges, réticules ou données décoratives.
- **Don't** utiliser glassmorphism, halos néon ou gradients violets comme décoration générique.
- **Don't** exposer les paramètres du modèle avant l'action attendue.
- **Don't** associer une action destructive à un geste facile à déclencher par erreur.
- **Don't** imbriquer des cartes, surdimensionner les arrondis ou ralentir la tâche avec une chorégraphie.
- **Don't** utiliser une bande latérale colorée de plus de 1 px comme accent de conteneur.
