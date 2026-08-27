# Inventaire tiers — préparation de redistribution

Relevé du 27 août 2026 à partir des `package.json` installés et de
`pnpm-lock.yaml`. Ce document est un inventaire de préparation, **pas un
remplacement des textes de licence ou une validation juridique complète**.
La licence propre à DrawMotion reste à choisir par le mainteneur.

## Dépendances directes déclarées en production

| Paquet                     | Version installée | Licence déclarée |
| -------------------------- | ----------------- | ---------------- |
| @base-ui/react             | 1.7.0             | MIT              |
| @fontsource-variable/geist | 5.3.0             | OFL-1.1          |
| @mediapipe/tasks-vision    | 1.0.1             | Apache-2.0       |
| class-variance-authority   | 0.7.1             | Apache-2.0       |
| clsx                       | 2.1.1             | MIT              |
| lucide-react               | 1.33.0            | ISC              |
| react / react-dom          | 19.2.8            | MIT              |
| shadcn                     | 4.19.0            | MIT              |
| sonner                     | 2.0.8             | MIT              |
| tailwind-merge             | 3.6.0             | MIT              |
| tw-animate-css             | 1.4.0             | MIT              |

Cette liste ne signifie pas que chaque paquet est embarqué dans le navigateur.
Les transitifs et les outils de build doivent aussi être examinés selon les
fichiers effectivement redistribués. L'inventaire complet des métadonnées est
reproductible avec `pnpm licenses list --json` (inclut des chemins locaux : ne
pas publier sa sortie brute). Les métadonnées seules ne remplacent pas la
lecture des fichiers `LICENSE`, `COPYING` et `NOTICE` applicables.

## Ressources embarquées hors bundle applicatif

- `public/vision/` : modèle et six fichiers runtime MediaPipe. Versions,
  origine officielle et empreintes dans [le relevé de provenance](../public/vision/README.md).
  Vérifier spécifiquement les conditions du modèle téléchargé, puis conserver
  les textes Apache et notices applicables ; ne pas déduire automatiquement
  la licence du modèle de celle du paquet JavaScript.
- Geist : police locale issue de `@fontsource-variable/geist`, texte OFL dans
  son fichier `LICENSE`. Préserver ce texte dans la distribution.
- `public/brand/drawmotion-symbol-b.png` et `public/onboarding/*.png` : visuels
  générés pour le projet selon l'historique de conception. Faire confirmer
  leur provenance et leur périmètre de réutilisation par le mainteneur avant
  publication ; ne pas les attribuer à MediaPipe ou à une bibliothèque d'icônes.
- `src/components/ui/` : composants intégrés à partir de shadcn/Base UI ;
  conserver les notices applicables au code copié, même s'il a été adapté.

## Avant toute distribution publique

- [ ] Choisir la licence de DrawMotion et ajouter le texte `LICENSE` approuvé.
- [ ] Relire les licences et notices directes/transitives pertinentes pour le build final.
- [ ] Vérifier les conditions de redistribution du modèle et des visuels.
- [ ] Fournir les textes d'attribution/licence requis avec le site statique et le code source.
- [ ] Vérifier que les notices restent présentes dans l'artefact Vercel final.

Aucune de ces étapes n'est déclarée terminée par la présence de cet inventaire.
