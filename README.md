# DrawMotion

Dessinez dans les airs, directement dans votre navigateur. DrawMotion transforme
les mouvements d'une main devant une webcam en dessin 2D : pincez pour tracer,
relâchez pour lever le stylo, fermez le poing pour gommer.

Prototype en préparation pour une démo publique, version `1.0.0-rc.1`.
La démo n'est pas encore publiée. [Capacités et limites](CHANGELOG.md).

## Démarrer

Prérequis : **Node.js 24** et **pnpm 11.19.0**.

```sh
git clone https://github.com/Osiris-Balonga/drawmotion.git
cd drawmotion
pnpm install --frozen-lockfile
pnpm dev
```

Le dépôt est encore privé : le clonage nécessite actuellement un accès.
Ouvrez l'URL affichée par Vite, cliquez sur l'aperçu caméra et suivez le tutoriel.
Aucune clé API ni serveur Python n'est nécessaire. Chrome et Edge sur ordinateur
sont les cibles initiales ; consultez les [limites de compatibilité](docs/COMPATIBILITY.md).

## Utilisation

- **Viser** : déplacez l'index ; le point violet indique la position.
- **Dessiner** : rapprochez le pouce et l'index. Relâchez pour terminer le trait.
- **Gommer** : fermez le poing et passez sur le dessin.
- **Commandes gestuelles** : maintenez index et majeur levés, signe paix.
  Choisissez ensuite une grande cible en pinçant. Ce geste est désactivé pendant
  les premières missions du tutoriel pour ne pas les interrompre.
- **Réglages** : le dock et les commandes partagent couleur, épaisseur et style.
  La roue HEX/RGB du dock s'utilise à la souris, au tactile ou au clavier.
- **Précision** : Libre suit le mouvement, Stabilisé atténue les irrégularités,
  Formes peut régulariser lignes, cercles, ellipses et rectangles. « Garder mon
  tracé » permet de refuser une correction.
- **Navigation** : boutons de zoom, `+` / `-` / `0`, Espace + glisser pour déplacer
  la toile. `M` ouvre les commandes ; Ctrl/Cmd + Z annule.
- **Export** : le PNG contient la zone visible au zoom courant, pas automatiquement
  tout le document. Dézoomez/recentrez avant d'exporter.

Le dessin reste en mémoire : **exportez avant de recharger ou de fermer**.
Les réglages fonctionnent sans caméra, mais le tracé libre nécessite encore une
main détectée. La précision dépend du cadrage, de l'éclairage et du matériel ;
DrawMotion ne remplace pas une tablette graphique.

## Traitement local

MediaPipe Hand Landmarker s'exécute dans un Web Worker. Le modèle, WASM, les
polices et les illustrations sont servis avec le site. DrawMotion n'enregistre
ni ne téléverse la vidéo ; le micro n'est pas demandé. Seule la progression du
tutoriel est conservée dans le stockage local.

La [documentation de confidentialité](docs/COMPATIBILITY.md#confidentialité)
distingue les données en mémoire, les requêtes normales de fichiers et les
contrôles réseau. Pour une vulnérabilité, voir [SECURITY.md](SECURITY.md).

## Contribuer et tester

React, TypeScript, Vite, Tailwind CSS, shadcn/ui **Base UI**, MediaPipe et Canvas
2D. Pas de Three.js, backend ou store global.

```sh
pnpm test                       # unitaires + composants + intégration
pnpm exec playwright install chromium
pnpm test:e2e                   # parcours navigateur sur un build de production
```

Les groupes se lancent séparément : `test:unit`, `test:components`,
`test:integration`. `test:all` lance tous les tests.
Voir [CONTRIBUTING](CONTRIBUTING.md), [l'architecture](docs/ARCHITECTURE.md) et
[la stratégie de tests](docs/TESTING.md), notamment ce qui exige une vraie webcam.

## Licence et livraison

Le code original est sous [licence MIT](LICENSE). Les dépendances, la police et
le modèle conservent leurs licences : [notices tierces](docs/THIRD_PARTY.md).
`pnpm build` inclut les textes requis dans `dist/licenses/`.

La publication reste conditionnée à la [QA manuelle](docs/qa/v1.0.0.md) et à la
[procédure de livraison](docs/RELEASE.md). Les anciens plans sont conservés dans
[les archives](docs/archive/README.md), pas utilisés comme instructions actuelles.
