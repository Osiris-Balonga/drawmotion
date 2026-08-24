---
name: DrawMotion
description: Une toile gestuelle guidée, précise et immédiatement compréhensible.
---

<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->

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

Stratégie restreinte : neutres francs, toile blanche, coque presque noire et accent indigo-violet réservé aux actions, à la progression et au suivi actif. Les valeurs exactes seront résolues en OKLCH pendant le lot 2.

### Primary

- **Indigo de mouvement** `[à résoudre pendant l'implémentation]` : action principale, outil sélectionné, progression du tutoriel et focus.

### Secondary

- **Vert de suivi** `[à résoudre pendant l'implémentation]` : détection fiable et réussite.
- **Orange d'attention** `[à résoudre pendant l'implémentation]` : cadrage imparfait et avertissements récupérables.

### Neutral

- **Coque graphite** `[à résoudre pendant l'implémentation]` : arrière-plan et barres d'outils.
- **Toile blanche pure** `[à résoudre pendant l'implémentation]` : surface de dessin uniquement.
- **Encre claire** `[à résoudre pendant l'implémentation]` : texte principal sur la coque.

**The Rare Accent Rule.** L'indigo-violet ne décore jamais une surface inactive ; sa rareté indique une action ou un état réel.

## Typography

**Display Font:** sans-serif technique unique `[famille à choisir pendant l'implémentation]`  
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

Une barre supérieure compacte contient la marque, annuler, rétablir et exporter. Le rail gauche contient les outils de dessin. Les deux restent utilisables au clavier et à la souris.

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

