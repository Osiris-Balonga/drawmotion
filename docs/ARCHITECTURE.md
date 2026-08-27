# Architecture actuelle

Application cliente React/TypeScript, sans API serveur ni base de données.
L'interface possède les réglages ; le flux de frames et le rendu restent
impératifs pour ne pas provoquer un rendu React à chaque point.

## Parcours d'une image

```text
getUserMedia → HandTrackingSession → WorkerHandTracker → Worker MediaPipe
                         ↓ résultats
           classifieur + détecteur de pincement
                         ↓
             useWorkspaceGestures
       filtre → coordonnées écran → intentions
                         ↓
             CanvasDrawingController
       document + historique + assistance
                         ↓
             TwoLayerCanvasRenderer → PNG
```

Le Worker exécute Hand Landmarker ; le classifieur applicatif interprète ses
landmarks. Il n'y a pas de réseau d'inférence, de service Python ou de Three.js.
L'adaptateur MediaPipe utilisé **dans** le Worker n'est pas un ancien mode
d'inférence sur le thread principal.

## Où intervenir

| Responsabilité                                                | Emplacement                                           |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| Autorisation, flux vidéo, arrêt des pistes                    | `src/infrastructure/camera/`                          |
| Capture, file bornée, protocole Worker, modèle et diagnostics | `src/infrastructure/mediapipe/`, `src/workers/`       |
| Pincement, classification, stabilité, rupture de suivi        | `src/core/gestures/`                                  |
| Miroir caméra vers écran                                      | `src/core/geometry/coordinate-mapping.ts`             |
| Traits, historique, régularisation, viewport et Canvas        | `src/core/drawing/`                                   |
| Réglages partagés et composition de l'écran                   | `src/features/workspace/workspace-shell.tsx`          |
| Adaptation des frames aux commandes, menu et feedback         | `src/features/workspace/use-workspace-gestures.ts`    |
| Zoom, déplacement, raccourcis clavier                         | `src/features/workspace/use-workspace-navigation.ts`  |
| Progression et observation des exercices                      | `src/features/onboarding/use-workspace-onboarding.ts` |
| Machine du tutoriel et stockage versionné                     | `src/features/onboarding/`                            |
| Contrôles du dock et composants Base UI                       | `src/features/toolbar/`, `src/components/ui/`         |

Les trois hooks de workspace ont des responsabilités distinctes, pas un store
global. Le shell fournit le même état et les mêmes callbacks au dock et aux
commandes gestuelles : aucune copie indépendante des couleurs ou des épaisseurs.

Les styles du workspace sont importés dans un ordre explicite :
`chrome.css`, `camera.css`, `interactions.css`, `responsive.css`.
Les règles adaptatives restent en dernier ; les tokens sont dans
`src/styles/globals.css`.

## Invariants à préserver

- **Une image en vol vers le Worker**, au plus une remplaçante en attente.
  Libérer les bitmaps abandonnés et les ressources lors de l'arrêt.
- **Pas de raccord après une rupture de suivi.** Une reprise distante réancre
  le filtre ; l'ancien point ne doit pas devenir le départ d'un nouveau trait.
- **Un seul miroir horizontal.** Le crop circulaire est un aperçu visuel,
  pas la zone de détection ni une limitation des coordonnées de dessin.
- **Pas de clic gestuel sur les petits boutons.** Les pincements choisissent
  les grandes cibles de la palette contextuelle ; le dock est souris/clavier/tactile.
- **Unités explicites.** Les intentions utilisent des coordonnées écran CSS.
  Le contrôleur inverse le viewport pour conserver les points du document.
  Les épaisseurs affichées sont divisées par 1000, puis le renderer les adapte
  au petit côté de la toile et au zoom. Le poing doit utiliser la taille de
  gomme sélectionnée, pas un minimum caché ni celle du stylo.
- **Historique commun** pour traits et gomme. L'assistance conserve les points
  originaux pour pouvoir refuser une régularisation.
- **Export de la couche persistante visible**, sans caméra, contrôles ou pointeur.
  Le cadrage de tout le document n'est pas automatique.
- **Persistance limitée** au tutoriel : clé `drawmotion:onboarding`, schéma
  versionné. Donnée absente, ancienne, invalide ou stockage bloqué : première
  visite sans empêcher l'utilisation. Le dessin n'est pas sauvegardé.

## Tests et décisions

La [stratégie de tests](TESTING.md) distingue moteur, composants, intégrations
et parcours navigateur. Une webcam réelle reste nécessaire pour juger latence,
précision et reconnaissance en conditions variables.

Les [ADR](adr/) expliquent les décisions structurantes ; [PRODUCT](../PRODUCT.md)
et [DESIGN](../DESIGN.md) décrivent l'intention produit, pas des résultats de QA.
Le [plan initial archivé](archive/implementation-plan.md) n'est pas une liste
d'instructions à rejouer.
