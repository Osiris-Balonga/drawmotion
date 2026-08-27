# Contribuer à DrawMotion

Les correctifs reproductibles, améliorations de documentation et retours
d'usage sont bienvenus. Pour une nouvelle interaction gestuelle ou une refonte,
discuter d'abord du problème et du comportement attendu dans une issue.
Les échanges et PR peuvent être rédigés en français ou en anglais.

## Installation

Node.js 24 et pnpm 11.19.0, puis :

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Aucune clé API n'est requise. Les assets MediaPipe sont dans le dépôt.
Pour les tests navigateur : `pnpm exec playwright install chromium`.
La caméra exige localhost ou HTTPS, pas une adresse HTTP du réseau local.

## Une modification, une intention

- Partir de `dev` pour une branche courte et ouvrir la PR vers `dev`.
  Ne pas viser `main` directement ; la promotion est `dev -> main`.
- Garder des commits autonomes : correctif, refactorisation et docs séparés
  lorsqu'ils ont des intentions distinctes. Exemple : `fix(gestures): stop ink after tracking loss`.
- Décrire le problème, la solution, les risques et les vérifications réellement
  exécutées. Une capture est utile pour une modification visuelle.
- Ne pas ajouter de dépendance, couche générique ou test sans expliquer ce
  qu'il apporte. Réutiliser les réglages communs au dock et aux commandes.
- Les changements de seuils gestuels exigent une régression reproductible
  et un essai webcam : des fixtures seules ne prouvent pas la précision.
- Ne jamais committer secrets, captures privées, vidéos de webcam, build,
  couverture ou rapports. Tout nouvel asset doit avoir une provenance et une licence.
- Attendre la revue du mainteneur ; ne pas fusionner ni publier sans son accord.

Pour les frontières du code, consulter [ARCHITECTURE](docs/ARCHITECTURE.md).
Les composants UI utilisent Base UI, pas Radix.

## Vérifier sans multiplier les tests

Lancer d'abord le groupe concerné : `pnpm test:unit`, `pnpm test:components`
ou `pnpm test:integration`. Les parcours navigateur se filtrent par fichier :
`pnpm test:e2e gestures.spec.ts --workers=1`.

Avant une PR qui modifie le code, exécuter `pnpm validate` et
`pnpm test:coverage`. Une PR documentaire peut se limiter au formatage et
à la vérification des liens, en l'indiquant. La CI vérifie le build, les assets,
les budgets et les notices ; ne pas masquer un échec en baissant les seuils.

Un test doit détecter un défaut concret, pas vérifier ses propres constantes
ou les détails internes d'une bibliothèque. La [stratégie de tests](docs/TESTING.md)
précise les frontières simulées et les essais manuels nécessaires.

## Code assisté par IA

Le contributeur reste responsable de comprendre et vérifier ce qu'il propose,
de respecter les licences et de ne pas envoyer de données privées à un outil.
Une PR assistée par IA suit les mêmes exigences de revue et de preuve ; une
sortie générée ou un compte rendu de tests non exécutés n'est pas une validation.

## Communication et licence

Discuter des changements, pas des personnes. Pas de harcèlement, de données
personnelles publiées ou de contributions manifestement malveillantes. Le
mainteneur peut masquer ou fermer les échanges qui enfreignent ces règles ;
les abus sur GitHub peuvent aussi être signalés avec « Report content ».

Pour les vulnérabilités, suivre [SECURITY](SECURITY.md), pas une issue publique.
Les contributions originales sont proposées sous la [licence MIT](LICENSE) ;
les notices tierces doivent être conservées. Aucune cession de copyright
ni CLA supplémentaire n'est demandée.
