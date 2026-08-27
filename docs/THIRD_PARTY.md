# Licences et provenance

Vérification du 27 août 2026 pour le lockfile courant. La licence MIT de
[DrawMotion](../LICENSE) ne remplace pas celle des composants tiers.

## Ce que le build distribue

`pnpm build` produit `dist/licenses/` et vérifie sa présence et son contenu.
`pnpm verify:licenses` permet de refaire ce contrôle sur un build existant.

| Ressource                                  | Licence et texte distribué                          | Provenance                                       |
| ------------------------------------------ | --------------------------------------------------- | ------------------------------------------------ |
| JavaScript applicatif et transitifs        | Textes complets dans `bundled.md`, générés par Vite | Paquets effectivement inclus dans les chunks     |
| Worker MediaPipe, JS et WASM               | Apache-2.0, `mediapipe-Apache-2.0.txt`              | `@mediapipe/tasks-vision@1.0.1`                  |
| Hand Landmarker full, float16, version 1   | Apache-2.0, même texte                              | Modèle officiel inchangé ; références ci-dessous |
| Geist Variable 5.3.0                       | OFL-1.1, `geist-OFL.txt`                            | `@fontsource-variable/geist`                     |
| Composants shadcn/ui adaptés et CSS 4.19.0 | MIT, `shadcn-MIT.txt`                               | shadcn/ui, primitives Base UI                    |
| Tailwind CSS 4.3.3                         | MIT, `tailwindcss-MIT.txt`                          | `tailwindcss`                                    |
| tw-animate-css 1.4.0                       | MIT, `tw-animate-css-MIT.txt`                       | `tw-animate-css`                                 |
| Code original DrawMotion                   | MIT, `drawmotion-MIT.txt`                           | Copié depuis le LICENSE racine par Vite          |

Le rapport Vite couvre les modules JavaScript du bundle applicatif, pas les
assets copiés depuis `public/` ni automatiquement le build Worker séparé.
Les textes statiques complémentaires sont conservés dans
[public/licenses](../public/licenses/README.md). Les notices mixtes des icônes
Lucide sont conservées dans le texte complet de son paquet, pas réduites à « ISC ».

Le contrôle de packaging n'est pas une analyse juridique automatique. Après
mise à jour d'une dépendance, relire son texte, ses éventuels fichiers NOTICE et
l'artefact final ; la présence d'un identifiant SPDX ne suffit pas.

## Modèle et runtime MediaPipe

La [documentation officielle Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker)
relie le modèle full au
[Model Card Hand Tracking Lite/Full](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf).
La page 2 comporte « LICENSED UNDER — Apache License, Version 2.0 ».
C'est la référence de licence du modèle, distincte de celle du paquet JavaScript.

Les URLs versionnées, dates de récupération et SHA-256 du modèle et des six
fichiers runtime figurent dans [public/vision/README.md](../public/vision/README.md).
`pnpm verify:vision-assets` contrôle leur intégrité. Le texte Apache provient
du [LICENSE MediaPipe](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE).

## Visuels du projet

`public/brand/drawmotion-symbol-b.png` et `public/onboarding/*.png` sont des
visuels générés avec l'outil de génération d'images OpenAI, puis sélectionnés
et adaptés pour DrawMotion par le mainteneur. Ce ne sont pas des illustrations
MediaPipe ni des icônes Lucide. La licence MIT couvre les droits du mainteneur
sur ces assets ; elle ne garantit ni exclusivité sur un contenu généré, ni
disponibilité d'une marque. Aucune vidéo de webcam personnelle n'est nécessaire
au dépôt ni aux tests.

## Mettre à jour les notices

1. Mettre à jour le paquet et le lockfile dans la même PR.
2. Relire la licence et la provenance des nouveaux fichiers. Pour CSS, polices,
   modèles, WASM et code copié, actualiser le texte dans `public/licenses/`.
3. Exécuter `pnpm build`, `pnpm verify:vision-assets` et inspecter
   `dist/licenses/`, y compris les mentions de copyright.
4. Vérifier que le site déployé sert ces fichiers. Ne pas retirer ce dossier
   de l'artefact statique.
5. Pour auditer aussi les outils de développement : `pnpm licenses list --json`.
   Sa sortie contient des chemins locaux ; ne pas publier la sortie brute.

Les dépendances de développement ne sont pas toutes redistribuées avec le site.
Leur licence reste disponible dans chaque paquet installé depuis le lockfile.
