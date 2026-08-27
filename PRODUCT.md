# Produit

## Users

DrawMotion s'adresse en priorité aux personnes qui découvrent une démonstration de vision par ordinateur sur un ordinateur équipé d'une webcam. Elles ne doivent connaître ni MediaPipe ni les interfaces gestuelles. Elles veulent comprendre immédiatement la technologie, produire un dessin simple et constater que la main peut remplacer un dispositif de pointage.

## Product Purpose

DrawMotion transforme les mouvements détectés de la main en commandes de dessin 2D dans une expérience proche de Paint ou Excalidraw. Le produit réussit lorsqu'un nouvel utilisateur autorise la caméra, apprend les gestes, trace un dessin, change ses outils et exporte un PNG sans aide extérieure en moins de deux minutes.

## Brand Personality

Précise, pédagogique, spectaculaire. La voix est brève, rassurante et factuelle. L'expérience rend la technologie visible juste assez pour susciter la curiosité, puis s'efface derrière la création.

## Anti-references

- Les HUD de science-fiction remplis de jauges, réticules et données décoratives.
- Le glassmorphism, les halos néon et les gradients violets utilisés comme décoration générique.
- Les interfaces de démonstration qui exposent les paramètres du modèle avant d'expliquer l'action attendue.
- Les outils de dessin qui associent une action destructive à un geste facile à déclencher par erreur.
- Les composants surdimensionnés, les cartes imbriquées et les animations qui retardent la tâche.

## Design Principles

1. **Montrer pour apprendre.** Chaque instruction est validée par la détection réelle plutôt que par une longue explication.
2. **La toile d'abord.** La surface de dessin domine ; la technologie reste observable sans devenir le contenu principal.
3. **Prévenir plutôt que réparer.** Hystérésis, pause automatique et confirmations protègent contre les déclenchements involontaires.
4. **Toujours offrir une issue.** Souris et clavier permettent de régler les outils, gérer la toile et exporter si le suivi échoue. Le tracé libre nécessite encore une main détectée.
5. **Respecter la caméra.** La vidéo est locale, jamais enregistrée, et son cycle de vie reste explicite.

## Accessibility & Inclusion

Objectif WCAG 2.2 AA pour les contrôles et contenus applicables. Tous les outils sont accessibles au clavier, les états sont annoncés textuellement, la couleur n'est jamais le seul signal, les animations respectent `prefers-reduced-motion` et le zoom navigateur à 200 % reste utilisable. Ces objectifs ne constituent pas une certification ; le dessin libre sans caméra n'est pas encore implémenté.
