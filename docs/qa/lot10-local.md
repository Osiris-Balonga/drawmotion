# Lot 10 — validation locale du 27 août 2026

Environnement : Windows, Node 24.18.0, pnpm 11.19.0. Travail conservé en
commits atomiques sur `feat/immersive-workspace-onboarding`, sans push,
fusion, déploiement ou changement de visibilité du dépôt.

## Résultats

| Contrôle                                   | Résultat                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Prettier, ESLint, TypeScript et build Vite | Réussis                                                                                      |
| Vitest avec couverture                     | 246 tests, 38 fichiers, réussis                                                              |
| Couverture                                 | Lignes 84,47 %, instructions 83,50 %, fonctions 83,90 %, branches 75,89 % ; seuils inchangés |
| Playwright Chromium, exécution en série    | 15 parcours réussis, sans retry                                                              |
| Edge 151.0.4129.107                        | 5 tests réussis : vraie inférence sous CSP et réglages dans 4 formats                        |
| Chrome 151.0.7922.174                      | Test de vraie inférence sous CSP réussi                                                      |
| Assets MediaPipe                           | 7 empreintes vérifiées                                                                       |
| JavaScript app + Worker                    | 655 597 octets bruts / 204 348 octets gzip                                                   |
| CSS                                        | 72 640 octets bruts                                                                          |
| Diagnostics de développement               | Absents du bundle de production, vérification automatisée                                    |
| Audit pnpm, production et développement    | Aucune vulnérabilité connue signalée au moment de l'audit                                    |
| Headers et CSP                             | Testés sur Vite preview avec la politique de `vercel.json`, y compris le CLI de vérification |

Le Worker de `security.spec.ts` n'est pas simulé : le vrai modèle/WASM analyse
une caméra **factice**, sans utiliser la webcam de l'utilisateur. Les autres
parcours gestuels injectent des landmarks déterministes.

Les contrôles visuels à 640×400 ont révélé un dépassement du panneau couleur
et un défilement de page provoqué par le focus. Le panneau défile désormais
dans sa hauteur disponible et le test vérifie que la page ne bouge plus.
Une mesure axe pendant l'animation d'ouverture était instable : les scans
attendent désormais les animations finies, sans retirer de règle de contraste.
La revue UX Impeccable / Make interfaces feel better est restée ciblée sur
l'adaptation et le feedback, sans refonte ni dépendance ajoutée.

## Non validé / avant publication

- [ ] Qualité, précision et latence « geste → encre » sur une vraie webcam.
- [ ] Retour de la main ailleurs en pinçant, sans ligne parasite, dans Chrome et Edge.
- [ ] Zoom **natif** du navigateur à 200 %, tablette réelle, tactile et clavier virtuel.
- [ ] Permissions système et faible luminosité sur les machines cibles.
- [ ] En-têtes sur une preview HTTPS réellement déployée.
- [ ] Exécution distante des workflows GitHub et disponibilité de Code Security.
- [ ] Safari/Firefox si leur prise en charge devient un objectif.

Ces résultats ne sont pas une certification WCAG ni une validation de
livraison. Le lot 11 n'est pas engagé.
