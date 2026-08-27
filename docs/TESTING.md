# Stratégie de tests

## Commandes

Prérequis : Node 24, pnpm 11 et `pnpm install --frozen-lockfile`.
Pour les parcours navigateur, installer Chromium une fois :
`pnpm exec playwright install chromium` (Linux/CI : ajouter `--with-deps`).

| Commande                         | Périmètre                                                         |
| -------------------------------- | ----------------------------------------------------------------- |
| `pnpm test:unit`                 | Logique, géométrie, adaptateurs et contrats isolés                |
| `pnpm test:components`           | Composants React isolés, interactions et accessibilité sémantique |
| `pnpm test:integration`          | Pipelines de gestes/dessin, workspace et cycle de vie caméra      |
| `pnpm test`                      | Les trois groupes Vitest, une seule exécution puis sortie         |
| `pnpm test:watch`                | Les trois groupes Vitest en surveillance                          |
| `pnpm test:watch --project unit` | Surveillance d'un seul groupe                                     |
| `pnpm test:coverage`             | Les trois groupes, rapport et seuils de couverture communs        |
| `pnpm test:e2e`                  | Parcours Chromium sur le build de production                      |
| `pnpm test:all`                  | Tous les tests Vitest puis Chromium, arrêt au premier échec       |
| `pnpm validate`                  | Formatage, lint, types et tous les tests, build inclus via E2E    |

Sélectionner plusieurs groupes :
`pnpm exec vitest run --project unit --project integration`.
Sélectionner un fichier : `pnpm test:unit pinch-detector`.
Inventorier sans exécuter : `pnpm exec vitest list --filesOnly`.

Sous-ensembles navigateur (tous inclus dans `test:e2e` et `test:all`) :

```sh
pnpm test:e2e workspace.spec.ts
pnpm test:e2e gestures.spec.ts
pnpm test:e2e accessibility.spec.ts
```

Pas besoin de nouveaux alias pour chaque scénario : Playwright filtre déjà
par fichier, ou par titre via `--grep`. Les trois projets Vitest ne collectent
aucun de ces fichiers navigateur.

**Changement de sens** : auparavant `test:unit` lançait toute la suite et
`test` restait en surveillance. Utiliser désormais `test` pour l'ensemble de
Vitest, `test:watch` pour la surveillance et `test:all` pour tout, navigateur inclus.

## Répartition et conventions

Les tests restent près du code ; leur suffixe définit un groupe sans doublon :

- `src/**/*.test.ts` : unitaires, sauf suffixe `.integration.test.ts` ;
- `src/**/*.test.tsx` : composants, sauf suffixe `.integration.test.tsx` ;
- `src/**/*.integration.test.{ts,tsx}` : intégrations de plusieurs modules réels ;
- `tests/e2e/**/*.spec.ts` : vrais parcours navigateur, hors Vitest.

La logique et les intégrations du moteur s'exécutent dans Node sans React ni
DOM. Les composants utilisent jsdom et le nettoyage Testing Library.
Les tests d'adaptateurs qui ont réellement besoin des API DOM portent
`// @vitest-environment jsdom`. Les intégrations React portent aussi cette
annotation et importent `@/test/setup` pour le nettoyage entre tests.
Ne pas ajouter un DOM global pour faire fonctionner un seul fichier.

Les quatre intégrations actuelles couvrent la chaîne des gestes, le contrôleur
avec le rendu Canvas, le workspace et la caméra avec son hook de cycle de vie.
Les limites matérielles (caméra, worker, encodeur Canvas) restent simulées dans
Vitest ; ces tests ne valident pas le modèle MediaPipe sur une vraie webcam.

Deux workers limitent la concurrence sur les PC modestes ; on peut ajuster
localement avec `pnpm test --maxWorkers=4`. Ne pas comparer des durées mesurées
avec des machines, couvertures ou niveaux de concurrence différents.

## Parcours navigateur volontairement restreints

- Première visite, illustration réellement chargée, tutoriel ignoré mémorisé
  après rechargement et possibilité de le rejouer ; géométrie caméra stable.
- Synchronisation dock/commandes des épaisseurs, styles, couleurs et gomme,
  avec une interaction clavier sur le vrai slider.
- Palette repliable et couleur personnalisée utilisables à 782×600 et 768×1024,
  caméra et contrôles dans la fenêtre, HEX conservé après réouverture.
- Caméra simulée, cinq missions réellement validées par la chaîne gestuelle,
  sélection de couleur/épaisseur par pincement, mémorisation de la réussite,
  gomme au poing, annuler/rétablir et téléchargement du PNG. Assertions sur
  les pixels dessinés, les zones gommées, les dimensions et le fond blanc
  du fichier décodé : un export vide ne suffit pas à faire passer le test.
- Perte de suivi pendant un trait et retour pincé à distance : deux traits
  distincts, sans trait parasite entre eux. Refus de permission puis nouvelle
  tentative réussie, et mise en pause de la caméra.
- Axe sur le tutoriel, le popover d'épaisseur/style, la couleur personnalisée
  et les commandes ; parcours clavier réel avec Tab, flèches, Espace et Échap,
  état sélectionné et restitution du focus au déclencheur.

Ces tests utilisent de nouveaux contextes Chromium isolés, sans caméra réelle,
sans compte, sans accès au profil personnel et sans changer le serveur de
développement. Playwright construit et sert l'app sur `127.0.0.1:4175` puis
arrête son serveur. Le port doit être libre : aucun serveur existant n'est réutilisé.
Les traces et captures d'échec sont dans `test-results/` ; le rapport se consulte
avec `pnpm exec playwright show-report`.

### Frontière exacte de simulation

Dans `gestures.spec.ts`, Chromium fournit un faux périphérique vidéo intégré :
le navigateur produit un vrai `MediaStream`, lit la vidéo et transfère de vrais
`ImageBitmap`. Une route Playwright remplace seulement le script Worker de
MediaPipe par `tests/e2e/fixtures/hand-tracking.worker.js`. Ce Worker respecte
le protocole INIT/FRAME/RESULT/DISPOSE et reçoit les poses synthétiques via un
`BroadcastChannel` réservé au test. Les coordonnées de poses viennent des
fixtures existantes ; les positions attendues et assertions de pixels sont
définies dans le scénario.

Le classifieur, l'hystérésis du pincement, le filtrage du pointeur, la machine
de gestes, le tutoriel, l'historique, Canvas et l'encodeur PNG sont réels.
Le test de refus simule seulement la première erreur `getUserMedia`, puis
délègue à l'API native. Aucun hook E2E ni asset vidéo personnel n'est livré
dans l'application. Les tests n'écrivent pas directement dans son état React.

Le test distinct `security.spec.ts` charge et exécute réellement le Worker,
le modèle et WASM locaux sous la CSP de production, sur une caméra factice.
Il vérifie aussi les en-têtes et le blocage d'une connexion externe. Ce n'est
pas une simulation de l'inférence, mais ce n'est toujours pas une vraie main.

**Ne sont pas validés par ce dispositif** : reconnaissance d'une vraie main, luminosité/occlusion,
latence matérielle, permission réelle dans chaque navigateur ou compatibilité
Safari/Firefox. Les invariants du Worker de production sont couverts dans
Vitest ; les assets ont leur vérification `pnpm verify:vision-assets`.
Une validation physique reste indispensable avant la démo publique.

### Accessibilité : portée et vérification manuelle

Les scans utilisent `@axe-core/playwright` (dépendance de développement), avec
les tags WCAG A/AA 2.0, AA 2.1 et AA 2.2. Ils n'excluent aucun élément et ne
désactivent aucune règle de ces tags. Les rapports JSON, y compris les
contrôles à examiner manuellement (`incomplete`), sont attachés au rapport
Playwright. Zéro violation automatique ne constitue pas une certification.

Avant livraison, vérifier aussi avec clavier/lecteur d'écran : nom et valeur
du slider de stylo/gomme, navigation des groupes par flèches, focus toujours
visible, annonces caméra compréhensibles, popovers à 200 % de zoom navigateur
et réduction des animations. L'outil gestuel ne fournit pas encore un mode
complet de tracé à la souris/clavier ; ne pas présenter le dessin comme
entièrement accessible sans suivi de la main.

Ce socle ne remplace pas les essais manuels du pincement, de la fluidité,
de l'effacement gestuel et de l'export d'un vrai dessin. Il ne couvre pas encore
Safari/Firefox ni toutes les tailles d'écran. Ne pas présenter des tests DOM
ou des appels Canvas simulés comme une validation visuelle de l'application.

## Nettoyage effectué

- Suppression du test isolé du titre, déjà vérifié dans le workspace et
  désormais dans le parcours de première visite.
- Suppression de l'assertion qui comparait une constante définie par le test
  à ses propres valeurs ; validation des coordonnées conservée.
- Retrait des six contrôles de formes statiques des fixtures ; les cinq gestes
  restent vérifiés par le classifieur. Les quatre tests mathématiques du
  générateur de ratios sont conservés près des fixtures : ils sécurisent les
  données utilisées aux frontières du pincement.
- Remplacement des anciennes vérifications CSS du parent Export et de classes
  caméra obsolètes ; la stabilité géométrique caméra est vérifiée dans Chromium.
- Remplacement de contrôles internes de bibliothèque/d'attributs de présentation
  par les états accessibles et les légendes réellement présentés à l'utilisateur.
- Aucun changement au moteur de dessin ou à ses seuils ; aucune baisse des
  seuils de couverture (80 % lignes/fonctions/instructions, 75 % branches).
- Les tests navigateur ont révélé que le bouton Export perdait son nom
  accessible quand son texte était masqué sur tablette : ajout d'un
  `aria-label` permanent, sans changement visuel.

## Défauts révélés par le complément du lot 9

- Après une perte de suivi prolongée, le filtre autorisait un déplacement
  important selon le temps écoulé, puis lissait depuis l'ancienne position.
  Une reprise pincée pouvait donc produire un trait oblique parasite. Le
  retour distant est désormais confirmé et réancré, sans changer les seuils
  de pincement ni supprimer la continuité des petits décrochages proches.
  Une régression unitaire ciblée et le scénario navigateur protègent ce cas.
- Le nom accessible passé au composant Slider était affecté au groupe,
  pas à son vrai contrôle range. Il est désormais transmis au Thumb Base UI,
  qui nomme l'input pour les lecteurs d'écran. Le scan axe couvre ce défaut.

## Règle pour chaque ajout

Avant d'ajouter un test : **quel bug concret détecterait-il que les autres ne
détectent pas ?** Tester un comportement, pas recopier une implémentation.

Conserver les cas limites distincts et les régressions connues, même paramétrés.
Ne pas fusionner artificiellement des scénarios pour faire baisser le compteur.
Simuler les limites externes, pas la logique qu'on prétend vérifier.
Un contrôle navigateur doit prouver ce que Node/jsdom ne peuvent pas prouver,
sans répéter toutes leurs combinaisons de paramètres. Une assertion CSS n'est
pertinente que pour un contrat visuel explicite, au niveau adapté.

## CI et revue

Le job existant `unit-tests` conserve son nom pour ne pas casser les contrôles
GitHub déjà requis. Il exécute les trois projets Vitest **une seule fois** avec
une couverture globale. Les rapports identifient chaque projet.
Le job `e2e-chromium` réutilise l'artefact du job `build` via
`E2E_USE_BUILD=1` : pas de deuxième compilation en CI. Cette variable suppose
un dossier `dist` vérifié ; ne pas l'utiliser localement avec un build périmé.
Pas de relance automatique masquant un test instable.

Avant revue : `pnpm validate`, `pnpm test:coverage` et vérifier qu'aucun fichier
de test n'est oublié ou collecté deux fois. Ne pas fusionner ni publier sans
l'accord du mainteneur.

Références : [projets Vitest](https://v4.vitest.dev/guide/projects),
[principes Testing Library](https://testing-library.com/docs/guiding-principles/),
[duplication des tests](https://martinfowler.com/articles/practical-test-pyramid.html#AvoidTestDuplication),
[accessibilité avec Playwright](https://playwright.dev/docs/accessibility-testing).

## Compléments du lot 10

- File bornée **avant** l'envoi au Worker synchrone : une image en vol, une
  remplaçante, fermeture des bitmaps abandonnés ; regression unitaire ciblée.
- Statistiques roulantes de latence/FPS, bornées et uniquement en développement.
- Le même parcours de réglage couvre aussi 720×450 et 640×400, équivalents
  de fenêtres de bureau à 200 %. Il vérifie le panneau complet et l'absence
  de déplacement de la page après focus, pas seulement la présence de la roue.
- Réduction de mouvement : feedback de mode encore visible ; échec du Worker :
  message de récupération et bouton de pause utilisables.
- Message petit écran vérifié avec axe ; les scans de popover attendent la
  fin des animations finies avant de mesurer les contrastes (aucune exclusion).
- `pnpm verify:bundle`, `pnpm verify:vision-assets` et audit des dépendances
  complètent les tests. Les en-têtes réels sont à vérifier séparément sur HTTPS.

Pour une machine occupée, `pnpm test:e2e --workers=1` exécute exactement les
mêmes tests en série, sans retry ni augmentation des délais.

Pour vérifier un navigateur déjà installé, dans PowerShell :

```powershell
$env:E2E_BROWSER_CHANNEL = 'msedge' # ou 'chrome'
pnpm test:e2e security.spec.ts --workers=1
Remove-Item Env:E2E_BROWSER_CHANNEL
```

Le navigateur démarre dans un profil de test isolé ; le profil de l'utilisateur
et sa webcam ne sont pas utilisés (flux vidéo factice). Sans cette variable,
la CI utilise le Chromium fourni par Playwright. Ces essais n'attestent pas
la fluidité du geste réel sur le matériel de l'utilisateur.
