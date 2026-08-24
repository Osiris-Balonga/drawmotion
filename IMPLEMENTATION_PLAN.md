# DrawMotion — plan d'implémentation et de livraison

Statut : plan approuvé à exécuter séquentiellement  
Produit : démonstration technologique web de dessin 2D contrôlé par la main  
Direction UX : piste C, tutoriel guidé puis toile minimale

## 1. Règles d'exécution pour tous les agents

Ce document est la source de vérité. Un agent ne travaille que sur un seul lot à la fois.

1. Lire ce document, `PRODUCT.md`, `DESIGN.md` et les ADR applicables avant toute modification.
2. Vérifier que le lot précédent est fusionné dans `dev`.
3. Mettre `dev` à jour, puis créer exactement la branche indiquée.
4. Ne modifier que les fichiers et responsabilités du lot courant.
5. Réaliser les commits dans l'ordre indiqué. Un commit doit compiler et ne contenir qu'une intention.
6. Exécuter `pnpm validate` avant chaque push. Exécuter aussi les commandes supplémentaires du lot.
7. Pousser la branche et ouvrir une pull request en mode brouillon dès le premier commit.
8. Compléter la checklist de la PR, joindre les preuves demandées, puis passer la PR en « Ready for review ».
9. Ne jamais fusionner sa propre PR sans autorisation explicite. L'agent s'arrête lorsque les contrôles sont verts et que la PR est prête, sauf si le mainteneur lui demande de poursuivre.
10. Ne jamais pousser directement sur `dev` ou `main`, sauf le bootstrap initial décrit au lot 0.

Interdictions permanentes :

- pas de `--force`, pas de réécriture d'historique après le début d'une revue ;
- pas de dépendance ajoutée sans justification dans la PR ;
- pas de `dist/`, couverture, rapports Playwright ou secrets dans Git ;
- pas de primitives ou paquets Radix : tous les composants shadcn reposent sur Base UI ;
- pas de logique MediaPipe, Canvas ou caméra dans les composants React ;
- pas de coordonnées vidéo stockées dans Zustand à chaque image ;
- pas de CDN en production pour le modèle ou les fichiers WASM ;
- pas de geste destructif sans confirmation explicite ;
- pas de fusion si une vérification manuelle prescrite n'a pas été faite.

## 2. Stack verrouillée

| Zone        | Choix                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Runtime     | Node.js 24 LTS, fixé par `.nvmrc` et `package.json#engines`                   |
| Paquets     | pnpm, version exacte dans `packageManager`                                    |
| Application | React 19, TypeScript strict, Vite 8                                           |
| Styles      | Tailwind CSS 4.3.x installé avec versions exactes, plugin `@tailwindcss/vite` |
| Composants  | shadcn/ui CLI v4, preset Base Nova, primitives Base UI, sources commitées     |
| Icônes      | Lucide React                                                                  |
| Vision      | `@mediapipe/tasks-vision`, Hand Landmarker, traitement local                  |
| Dessin      | Canvas 2D natif, deux couches superposées                                     |
| État UI     | Zustand ; ressources impératives hors store                                   |
| Tests       | Vitest, Testing Library, Playwright, axe-core                                 |
| Qualité     | ESLint, Prettier, TypeScript, couverture Vitest                               |
| CI          | GitHub Actions                                                                |
| Déploiement | Vercel : previews de PR, production depuis `main` uniquement                  |

Règle de version : le lot 1 résout les dernières versions stables compatibles et les écrit exactement dans `package.json` et `pnpm-lock.yaml`. Les lots suivants n'utilisent jamais `latest` hors mise à jour dédiée.

## 3. Architecture cible

```text
src/
  app/
    App.tsx
    providers.tsx
  components/
    ui/                         # sources shadcn possédées par le projet
  features/
    camera/
    onboarding/
    toolbar/
    workspace/
  core/
    drawing/                    # modèle de traits, commandes, historique
    gestures/                   # interprétation pure des landmarks
    geometry/                   # mapping et transformations de coordonnées
  infrastructure/
    camera/                     # getUserMedia et cycle de vie MediaStream
    mediapipe/                  # adaptateur Hand Landmarker
    persistence/                # préférences locales uniquement
  workers/
    hand-tracker.worker.ts
    protocol.ts
  stores/
    draw-store.ts
  styles/
    globals.css
  test/
    fixtures/
    setup.ts
public/
  models/
  wasm/
e2e/
docs/
  adr/
  qa/
scripts/
```

Flux obligatoire :

```text
Webcam -> Worker MediaPipe -> landmarks -> moteur de gestes
       -> intentions -> moteur de dessin -> Canvas
                                  |-> store UI -> React
```

React affiche l'interface. Le Worker produit des landmarks. Le moteur de gestes produit des intentions. Le moteur de dessin exécute ces intentions. Aucun module ne saute une couche.

## 4. Modèle Git et GitHub

### Branches longues

- `dev` : branche d'intégration par défaut, toujours compilable et testée ; toutes les PR de développement la ciblent.
- `main` : branche de production ; elle ne reçoit que des PR de promotion dont la tête est exactement `dev`.

### Branches courtes

- `chore/<sujet>` pour l'outillage ;
- `feat/<sujet>` pour une capacité produit ;
- `fix/<sujet>` pour une correction ;
- `docs/<sujet>` pour la documentation seule ;
- `release/vX.Y.Z` pour préparer une livraison avant fusion dans `dev` ;
- `hotfix/<sujet>` créé depuis `dev` pour une urgence publique, puis promu avec le reste de `dev`.

### Commits

Utiliser Conventional Commits : `chore`, `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `ci`.

Un commit est créé immédiatement après que son intention est terminée et que les tests concernés passent. Ne pas attendre la fin du lot pour tout committer.

### Pull requests

- PR brouillon après le premier commit ;
- taille cible : moins de 500 lignes métier modifiées, hors lockfile, composants shadcn générés et modèle binaire ;
- rebase merge recommandé vers `dev` pour conserver les commits atomiques prescrits ;
- merge commit pour la PR de promotion `dev -> main`, afin que la frontière de livraison soit explicite ;
- les trois méthodes de fusion restent disponibles au mainteneur comme dans PlotTwist ;
- les branches fusionnées ne sont pas supprimées automatiquement ;
- aucune PR suivante avant fusion de la précédente, sauf correctif documentaire sans conflit explicitement autorisé.

### Protection de `dev`

Activer après le premier push :

- require a pull request before merging ;
- require conversation resolution ;
- block force pushes and deletions ;
- do not allow bypassing ;
- une approbation humaine quand un second mainteneur est disponible.

Après le premier passage réussi de chaque workflow, ajouter comme contrôles requis :

- `quality` ;
- `unit-tests` ;
- `build` ;
- `e2e-chromium` à partir du lot 9 ;
- `Vercel` ou le nom exact du contrôle de preview à partir de sa première exécution.

### Protection de `main`

Règles de production :

- PR dont la branche source est strictement `dev` ;
- contrôle requis `Production source policy` ;
- historique linéaire non requis afin d'autoriser le merge commit de promotion ;
- environnement GitHub `production` avec approbation manuelle si le plan GitHub le permet ;
- déploiement Vercel réussi requis avant de clore la release.

Sur un dépôt privé GitHub Free, certaines protections ne sont pas configurables. Dans ce cas, les workflows restent obligatoires par convention et les règles sont activées dès que le dépôt devient public ou que le forfait le permet.

## 5. Scripts npm obligatoires

Le lot 1 doit fournir les scripts suivants, qui deviennent contractuels :

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint . --max-warnings=0",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc -b --pretty false",
  "test": "vitest",
  "test:unit": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "validate": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build"
}
```

Le script `validate` ne doit pas être affaibli pour faire passer une PR.

## 6. Workflows GitHub Actions

### `.github/workflows/ci.yml`

Déclencheurs : `pull_request` vers `dev` ou `main`, et `push` sur `dev`.

Permissions globales : `contents: read`. Ajouter des permissions seulement au job qui en a besoin.

Activer une concurrence par workflow et branche, avec annulation du run précédent sur une PR.

Jobs séparés et noms stables :

1. `quality`
   - checkout ;
   - Node 24 ;
   - pnpm depuis `packageManager` ;
   - cache pnpm ;
   - `pnpm install --frozen-lockfile` ;
   - `pnpm format:check` ;
   - `pnpm lint` ;
   - `pnpm typecheck`.
2. `unit-tests`
   - même installation ;
   - `pnpm test:coverage` ;
   - artefact de couverture, conservation 14 jours.
3. `build`
   - même installation ;
   - vérification du checksum des assets MediaPipe ;
   - `pnpm build` ;
   - artefact `dist`, conservation 7 jours.
4. `e2e-chromium`, ajouté au lot 9
   - dépend de `build` ;
   - installation Chromium Playwright avec dépendances ;
   - `pnpm test:e2e --project=chromium` ;
   - rapport Playwright uploadé même en cas d'échec.

Les actions doivent être épinglées sur une version majeure maintenue au moment du bootstrap. Ne jamais utiliser une action inconnue proposée par un agent sans revue de sa provenance.

### `.github/workflows/production-source.yml`

Déclencheur : toute pull request vers `main`. Le job stable `Production source policy` échoue si `github.head_ref` n'est pas exactement `dev`. Une release ne contourne jamais cette règle.

### `.github/workflows/security.yml`

- CodeQL JavaScript/TypeScript sur PR, `dev`, `main` et chaque lundi ;
- Dependency Review sur les PR ;
- permissions minimales ;
- aucune écriture sur le dépôt.

### `.github/dependabot.yml`

- npm/pnpm chaque lundi ;
- GitHub Actions chaque lundi ;
- toutes les PR Dependabot ciblent `dev` ;
- regrouper les mises à jour mineures de développement ;
- ne jamais auto-fusionner une mise à jour MediaPipe, Vite, React, Tailwind ou Playwright.

### `.github/workflows/release.yml`

Déclencheur : tag `v*.*.*` présent sur un commit de `main`.

Étapes :

1. vérifier que le commit tagué appartient à `main` ;
2. réexécuter `pnpm validate` et les E2E ;
3. créer la GitHub Release et générer les notes ;
4. joindre les checksums des assets et le rapport de build ;
5. ne jamais redéployer manuellement : Vercel déploie la branche `main`.

## 7. Déploiement Vercel

À configurer après le lot 1 :

- connecter le dépôt GitHub ;
- framework preset : Vite ;
- commande d'installation : `pnpm install --frozen-lockfile` ;
- commande de build : `pnpm build` ;
- dossier de sortie : `dist` ;
- production branch : `main` ;
- previews : toutes les PR ;
- ne rattacher le domaine public qu'au lot 11.

Ajouter dans `vercel.json`, puis tester réellement :

- `Permissions-Policy: camera=(self), microphone=(), geolocation=()` ;
- `Referrer-Policy: strict-origin-when-cross-origin` ;
- `X-Content-Type-Options: nosniff` ;
- une CSP autorisant uniquement les ressources locales, le Worker et WebAssembly nécessaires.

La CSP doit être dérivée du build réel. Ne pas copier une CSP non testée. L'objectif final est notamment `default-src 'self'`, `worker-src 'self' blob:` et l'autorisation WebAssembly strictement nécessaire.

## 8. Lots d'implémentation

Chaque lot commence depuis le `dev` fusionné du lot précédent et ouvre une PR vers `dev`.

### Lot 0 — Gouvernance minimale et premier push

Branche : aucune ; seule exception de travail local sur `main` avant la création de `dev`.

Créer uniquement :

- `.gitignore`, `.gitattributes`, `.editorconfig`, `.nvmrc` ;
- `README.md` avec objectif et statut « pré-implémentation » ;
- `PRODUCT.md`, `DESIGN.md` ;
- ce document ;
- `docs/adr/0001-technical-stack.md` ;
- `docs/adr/0002-git-and-release-strategy.md`.

Commit exact :

```text
chore(repo): initialize DrawMotion governance
```

Puis :

1. créer un dépôt GitHub privé vide, sans README généré ;
2. pousser uniquement ce commit ;
3. créer `dev`, la définir comme branche par défaut et y diriger toutes les PR applicatives ;
4. activer les protections disponibles sur `dev` et `main` ;
5. ne plus jamais pousser directement sur ces deux branches.

Critère de sortie : le remote ne contient que la gouvernance et aucun code applicatif.

### Lot 1 — Bootstrap reproductible

Branche : `chore/bootstrap-app`  
PR : `chore: bootstrap the DrawMotion web application`

Commits exacts :

1. `chore(app): scaffold React TypeScript with Vite`
   - initialiser Vite dans le dossier existant ;
   - fixer Node 24 et pnpm ;
   - activer TypeScript strict ;
   - ajouter alias `@/* -> src/*` ;
   - retirer toute démo Vite.
2. `chore(ui): configure Tailwind CSS and shadcn`
   - installer Tailwind 4.3.x et `@tailwindcss/vite` avec versions exactes ;
   - `@import "tailwindcss"` dans `src/styles/globals.css` ;
   - exécuter `pnpm dlx shadcn@latest init -d --base base` ;
   - vérifier le preset Base Nova, CSS variables, alias et `rsc: false` ;
   - vérifier que `components.json` déclare Base UI et qu'aucun paquet `@radix-ui/*` ou `radix-ui` n'est installé ;
   - ne générer encore que `button` et `tooltip`.
3. `chore(quality): add static analysis and unit test harness`
   - ESLint, Prettier, Vitest, Testing Library, jsdom ;
   - scripts contractuels ;
   - un smoke test de `App`.
4. `ci: validate pull requests with GitHub Actions`
   - `ci.yml`, template de PR et `CODEOWNERS` si pertinent.

Vérifications : `pnpm validate`, puis exécution GitHub de `quality`, `unit-tests`, `build`.

Après fusion : rendre ces trois jobs obligatoires dans la protection de `dev`.

### Lot 2 — Design system et coque direction C

Branche : `feat/guided-workspace-shell`  
PR : `feat: establish the guided DrawMotion workspace`

Commits exacts :

1. `feat(ui): define DrawMotion semantic design tokens`
   - thème sombre `new-york` en OKLCH ;
   - accent violet, succès vert, avertissement orange ;
   - contraste WCAG AA ;
   - `prefers-reduced-motion` ;
   - aucun gradient ni glassmorphism.
2. `feat(ui): add accessible workspace primitives`
   - ajouter via shadcn : `alert-dialog`, `badge`, `dialog`, `popover`, `progress`, `separator`, `slider`, `sonner`, `toggle-group`, `tooltip` ;
   - ne pas utiliser `Card` comme conteneur générique ;
   - envelopper les tooltips dans un provider unique.
3. `feat(workspace): build the responsive drawing shell`
   - barre supérieure ;
   - espace Canvas vide ;
   - rail d'outils gauche ;
   - caméra circulaire simulée ;
   - panneau d'instruction inférieur ;
   - structure correcte à 1280×720, 1440×900 et 1920×1080.
4. `test(ui): cover workspace keyboard and accessibility states`

Critères : aucun moteur réel ; toutes les commandes sont désactivées ou simulées explicitement ; capture des trois résolutions jointe à la PR.

### Lot 3 — Caméra, confidentialité et erreurs

Branche : `feat/camera-lifecycle`  
PR : `feat: add privacy-first camera lifecycle`

Commits exacts :

1. `test(camera): specify camera lifecycle states`
   - tests des états `idle`, `requesting`, `ready`, `denied`, `missing`, `busy`, `failed`, `stopped`.
2. `feat(camera): implement the MediaStream adapter`
   - encapsuler `getUserMedia` ;
   - demander uniquement la vidéo ;
   - arrêter toutes les tracks au démontage et à la mise en pause de l'onglet ;
   - caméra frontale, résolution idéale 1280×720.
3. `feat(camera): add permission and recovery experience`
   - écran « Activer ma caméra » ;
   - texte local, non enregistré ;
   - erreurs actionnables ;
   - sélection de caméra si plusieurs périphériques existent.
4. `test(camera): verify mocked permission flows`

Critère manuel : permission accordée, refusée, retirée pendant l'usage, webcam absente et webcam occupée par une autre application.

### Lot 4 — MediaPipe dans un Worker

Branche : `feat/hand-tracking-worker`  
PR : `feat: detect hand landmarks off the main thread`

Commits exacts :

1. `chore(vision): vendor verified MediaPipe runtime assets`
   - installer `@mediapipe/tasks-vision` avec version exacte ;
   - héberger localement modèle et WASM ;
   - documenter URL d'origine, licence, version et SHA-256 ;
   - ajouter `scripts/verify-vision-assets.mjs`.
2. `test(vision): define the tracker port and worker protocol`
   - messages versionnés `INIT`, `FRAME`, `RESULT`, `METRICS`, `ERROR`, `DISPOSE` ;
   - fixtures déterministes de landmarks ;
   - faux tracker pour les tests.
3. `feat(vision): run Hand Landmarker in a dedicated worker`
   - `runningMode: VIDEO` ;
   - au maximum une inférence en vol ;
   - abandon des frames obsolètes ;
   - transfert d'`ImageBitmap` ;
   - destruction propre du Worker.
4. `feat(vision): render tracking status and landmark overlay`
   - overlay aligné avec la caméra miroir ;
   - état fiable, hésitant ou perdu ;
   - métriques disponibles en développement uniquement.
5. `test(vision): cover initialization failure and worker disposal`

Critères : aucune requête réseau tierce après chargement ; interface utilisable pendant l'inférence ; pas de fuite de Worker ou MediaStream.

### Lot 5 — Moteur de gestes

Branche : `feat/gesture-engine`  
PR : `feat: translate hand landmarks into stable gestures`

Commits exacts :

1. `test(gestures): specify gesture classification fixtures`
   - pincement, main ouverte, poing, main incertaine, perte de suivi ;
   - tests de non-régression aux seuils.
2. `feat(gestures): classify pinch open-hand and fist states`
   - distances normalisées par la taille de la paume ;
   - hystérésis distincte entrée/sortie ;
   - seuils centralisés et documentés.
3. `feat(gestures): smooth pointer motion and map coordinates`
   - filtre temporel ;
   - transformation caméra miroir vers Canvas ;
   - verrouillage de la dernière position fiable ;
   - aucune extrapolation après perte de main.
4. `feat(gestures): emit versioned drawing intentions`
   - `POINTER_MOVE`, `DRAW_START`, `DRAW_MOVE`, `DRAW_END`, `PAUSE`, `TRACKING_LOST` ;
   - machine d'état pure et testable.
5. `test(gestures): cover jitter and accidental activation resistance`

Critère : une main immobile près du seuil ne doit pas alterner rapidement entre dessin et pause.

### Lot 6 — Moteur Canvas et historique

Branche : `feat/canvas-engine`  
PR : `feat: add the two-layer drawing engine`

Commits exacts :

1. `test(drawing): specify strokes commands and history behavior`
   - modèle `Stroke`, points normalisés, outil, couleur, largeur ;
   - historique borné ;
   - redo invalidé après une nouvelle action.
2. `feat(drawing): implement immutable drawing commands`
   - ajout de trait, suppression par gomme, effacement, undo, redo ;
   - fonctions indépendantes du DOM.
3. `feat(canvas): render persistent and interaction layers`
   - Canvas principal persistant ;
   - Canvas supérieur pour curseur et prévisualisation ;
   - rendu par `requestAnimationFrame` ;
   - device pixel ratio pris en compte.
4. `feat(canvas): connect gesture intentions to drawing commands`
   - pas de re-render React par frame ;
   - fin automatique du trait en cas de perte de suivi.
5. `test(canvas): verify resize replay and high-DPI rendering`

Critères : aucun trait perdu lors d'un redimensionnement ; undo/redo déterministes ; 60 Hz visuels visés même si la détection est moins fréquente.

### Lot 7 — Tutoriel guidé direction C

Branche : `feat/guided-onboarding`  
PR : `feat: teach DrawMotion in three validated gestures`

Commits exacts :

1. `test(onboarding): specify the three-step progression`
2. `feat(onboarding): validate hand placement pinch and open-hand steps`
   - une étape ne passe qu'après détection stable ;
   - progression `1 sur 3`, `2 sur 3`, `3 sur 3` ;
   - retour arrière et recommencer.
3. `feat(onboarding): add contextual gesture guidance`
   - panneau bas non bloquant ;
   - disparaît après réussite ;
   - revient sur hésitation ou erreur ;
   - bouton « Revoir les gestes ».
4. `feat(onboarding): persist completion locally`
   - stockage versionné ;
   - aucune donnée biométrique ou vidéo ;
   - possibilité de réinitialiser.
5. `test(onboarding): verify keyboard fallback and reduced motion`

Critère : un nouvel utilisateur atteint la toile en moins de deux minutes sans explication externe.

### Lot 8 — Outils complets et export

Branche : `feat/drawing-tools-export`  
PR : `feat: complete drawing controls and PNG export`

Commits exacts :

1. `feat(tools): add pen eraser color and thickness controls`
   - toutes les commandes utilisables par souris et clavier ;
   - état actif annoncé aux technologies d'assistance ;
   - sélection par pointeur gestuel et pincement.
2. `feat(history): expose undo redo and clear-canvas actions`
   - `Ctrl+Z`, `Ctrl+Y` et `Ctrl+Shift+Z` ;
   - confirmation shadcn `AlertDialog` avant effacement ;
   - boutons désactivés quand non applicables.
3. `feat(export): download the canvas as PNG`
   - fond blanc explicite ;
   - résolution physique du Canvas ;
   - nom `drawmotion-YYYY-MM-DD-HHmmss.png` ;
   - toast succès/échec avec Sonner.
4. `feat(shortcuts): add pen eraser and pause keyboard commands`
   - `P` stylo, `E` gomme, `Espace` pause ;
   - raccourcis désactivés quand un contrôle saisissable a le focus.
5. `test(tools): cover destructive confirmation and export behavior`

Critère : chaque fonction demandée est accessible sans geste et avec les gestes.

### Lot 9 — E2E, accessibilité et robustesse

Branche : `test/end-to-end-hardening`  
PR : `test: harden DrawMotion end to end`

Commits exacts :

1. `test(e2e): configure deterministic fake camera playback`
   - fixture vidéo Y4M courte et licenciée ;
   - Chromium avec faux périphérique et permission automatique ;
   - aucune dépendance à une webcam CI réelle.
2. `test(e2e): cover first-run drawing and PNG export`
   - permission -> tutoriel -> trait -> couleur -> épaisseur -> undo -> redo -> export.
3. `test(e2e): cover camera failures and tracking loss`
4. `test(a11y): enforce automated accessibility checks`
   - axe-core sur accueil, tutoriel et workspace ;
   - navigation clavier complète des outils ;
   - focus visible et ordre logique.
5. `ci: require Chromium end-to-end tests`
   - job `e2e-chromium` ;
   - artefacts en cas d'échec.

Après le premier run vert, ajouter `e2e-chromium` aux checks obligatoires de `dev`.

### Lot 10 — Sécurité, performance et compatibilité

Branche : `chore/production-hardening`  
PR : `chore: harden DrawMotion for production`

Commits exacts :

1. `perf(vision): enforce frame backpressure and collect diagnostics`
   - une frame maximum en attente ;
   - FPS détection, latence médiane et p95 en mode développement ;
   - aucune télémétrie distante.
2. `fix(responsive): harden supported desktop viewport layouts`
   - 1280×720 minimum ;
   - écrans plus petits : message de compatibilité actionnable ;
   - zoom navigateur 200 % pour les contrôles.
3. `chore(security): add restrictive production headers`
   - `vercel.json` et test de fumée des headers ;
   - CSP compatible Worker/WASM vérifiée sur une preview.
4. `ci(security): add CodeQL dependency review and Dependabot`
5. `docs(compatibility): document browsers privacy and troubleshooting`

Budgets de sortie :

- aucune erreur console dans le parcours nominal ;
- aucun appel réseau après chargement des assets locaux ;
- bundle applicatif analysé et régression majeure justifiée ;
- suivi stable sur Chrome et Edge récents ;
- dégradation explicite ailleurs.

### Lot 11 — Release candidate et livraison v1.0.0

Branche : `release/v1.0.0`, créée depuis `dev`  
PR 1 vers `dev` : `chore: prepare DrawMotion v1.0.0`  
PR 2 de promotion `dev` vers `main` : `release: DrawMotion v1.0.0`

Commits exacts :

1. `docs(release): add v1 manual QA checklist`
   - `docs/qa/v1.0.0.md` ;
   - matrices Chrome/Edge, Windows/macOS si disponibles ;
   - permission caméra, luminosité faible, main hors cadre, export.
2. `chore(release): prepare version 1.0.0`
   - version package ;
   - `CHANGELOG.md` ;
   - README final ;
   - mentions de confidentialité et licences tierces.
3. `fix(release): resolve v1 release candidate findings`
   - seulement si nécessaire ;
   - chaque correction référencée dans la checklist QA.

Procédure :

1. ouvrir la PR de préparation vers `dev` et attendre CI + preview Vercel ;
2. effectuer la QA manuelle sur la preview avec une vraie webcam ;
3. fusionner dans `dev` uniquement si la checklist est complète ;
4. geler les nouvelles fusions applicatives sur `dev` pendant la promotion ;
5. ouvrir une PR dont la tête est `dev` et la base `main`, sans modification supplémentaire ;
6. vérifier CI et preview, puis fusionner ;
7. vérifier la production Vercel et les headers ;
8. rattacher le domaine public ;
9. créer le tag annoté `v1.0.0` sur le commit de `main` ;
10. pousser le tag ; le workflow `release.yml` crée la GitHub Release ;
11. conserver un lien vers le rapport QA et le déploiement dans la release.

## 9. Couverture et stratégie de test

Seuils minimaux :

- `core/gestures` : 95 % lignes, 90 % branches ;
- `core/drawing` : 95 % lignes, 90 % branches ;
- `infrastructure/camera` : 90 % lignes ;
- ensemble du projet : 80 % lignes, 75 % branches.

Les tests doivent vérifier des comportements, pas les détails internes de React. Les snapshots visuels ne remplacent pas les assertions fonctionnelles.

La webcam CI est toujours simulée. Une vraie webcam reste obligatoire pour la release candidate.

## 10. Définition globale de « terminé »

DrawMotion v1 est terminé uniquement si :

- un nouvel utilisateur comprend et réussit les trois gestes en moins de deux minutes ;
- stylo, gomme, couleurs, épaisseur, effacement, undo, redo et export PNG fonctionnent ;
- la perte de main termine le trait sans artefact ;
- la vidéo et les landmarks ne quittent jamais l'appareil ;
- tous les assets d'exécution sont locaux et vérifiés ;
- souris et clavier permettent le parcours de secours ;
- les contrôles requis GitHub sont verts ;
- la QA avec webcam réelle est signée ;
- `main` correspond exactement au tag `v1.0.0` ;
- le rollback Vercel vers le déploiement précédent a été documenté et testé au moins une fois.

## 11. Workflow hotfix après livraison

1. créer `hotfix/<sujet>` depuis `dev` ;
2. écrire d'abord un test qui reproduit le défaut ;
3. commit `test: reproduce <défaut>` ;
4. commit `fix: resolve <défaut>` ;
5. PR vers `dev`, CI et approbation ;
6. fusionner dans `dev`, puis ouvrir immédiatement la promotion `dev -> main` ;
7. après CI, approbation et déploiement Vercel réussis, fusionner et taguer `v1.0.1` sur `main` ;
8. ne jamais corriger directement `main` : `dev` reste la source unique des promotions.

## 12. Sources techniques de référence

- Vite : https://vite.dev/guide/
- Tailwind CSS avec Vite : https://tailwindcss.com/docs/installation/using-vite
- shadcn/ui avec Vite : https://ui.shadcn.com/docs/installation/vite
- MediaPipe Hand Landmarker Web : https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- Playwright en CI : https://playwright.dev/docs/ci
- GitHub protected branches : https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Vercel et Git : https://vercel.com/docs/git
