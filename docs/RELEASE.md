# Livrer DrawMotion

## État de la candidate

`1.0.0-rc.1` est une version **locale non publiée**. Elle identifie la préparation
du lot 11, sans promettre que la QA finale est terminée. Ne pas ajouter de tag
ou passer en `1.0.0` avant validation du mainteneur.

La préparation continue exceptionnellement sur la branche existante
`feat/immersive-workspace-onboarding` : les lots précédents ne sont pas encore
intégrés à `dev`. Ne pas créer une release depuis le `dev` ancien ni réécrire
l'historique. Faire valider la séquence des PR et intégrer les lots précédents
avant de créer `release/v1.0.0` depuis `dev`, comme prévu par
[l'ADR Git](./adr/0002-git-and-release-strategy.md).

## 1. Préparer et tester

1. Installer les dépendances avec `pnpm install --frozen-lockfile` et Chromium
   avec `pnpm exec playwright install chromium`.
2. Exécuter `pnpm validate`, `pnpm test:coverage`, `pnpm verify:vision-assets`,
   `pnpm build`, `pnpm verify:bundle` et `pnpm audit --audit-level high`.
   Garder les opérations lourdes séquentielles sur une machine limitée.
3. Après autorisation de push, ouvrir les PR vers `dev` dans l'ordre ; attendre
   la CI distante et la preview HTTPS. Conserver les commits atomiques.
4. Renseigner [la QA v1](./qa/v1.0.0.md) sur le SHA exact de la preview avec
   webcam réelle. Un échec est corrigé dans un commit `fix(release): ...`
   référant l'ID QA, puis retesté. Ne pas retoucher les gestes sans anomalie.
5. Finaliser [les licences et notices](./THIRD_PARTY.md). Ne pas distribuer
   publiquement les assets avant ce contrôle.

## 2. Préparer la promotion

Après QA et accord explicite du mainteneur :

1. Sur la branche de release issue du `dev` intégré, passer la version à
   `1.0.0`, ajouter l'entrée datée correspondante au changelog et actualiser le
   statut README. Commit `chore(release): prepare version 1.0.0`.
2. Joindre les liens CI/QA/preview à la PR vers `dev`, faire relire, attendre
   l'accord de fusion. La version finale doit elle aussi passer la CI.
3. Geler les modifications pendant la promotion. Ouvrir la PR `dev -> main`,
   attendre les checks, puis fusionner uniquement avec l'accord du mainteneur.
4. Vérifier le déploiement de production du SHA promu : ouverture, caméra,
   tracé, PNG, et `pnpm verify:security-headers <URL-HTTPS>`.

L'intégration Git Vercel est la voie prévue ; ne pas ajouter un deuxième
déploiement CI concurrent. Pas de token dans les fichiers ou les commandes
copiées dans un compte rendu. Ne pas confondre Vite preview local et Vercel.

## 3. Retour arrière

Avant livraison, relever l'URL/ID du déploiement de production précédent connu
comme sain et le SHA courant. Si c'est la première production, il n'y a pas
encore de version saine précédente : consigner cette limite, préparer et
tester le scénario sur un environnement de recette avant de le dire validé.

Avec l'autorisation du mainteneur, utiliser l'action de rollback de Vercel
vers ce déploiement identifié. Vérifier à nouveau la page, la caméra, le PNG
et les en-têtes. Consigner date, URLs, SHA, résultat et retour éventuel à la
candidate. Une procédure écrite n'est pas un essai de rollback effectué.
Ne pas déplacer un tag publié ni faire de force-push pour annuler une release.

## 4. Tag et brouillon GitHub Release

Une fois production et QA approuvées, le mainteneur crée et pousse un tag
**annoté** `v1.0.0` sur le HEAD validé de `main`. Ne pas exécuter cette étape
depuis la branche de travail. Le workflow `release.yml` :

- ne réagit qu'aux tags `v*`, puis refuse une version non stable ;
- exige un tag annoté, égal au HEAD de `main`, et une version package identique ;
- vérifie la présence du changelog de cette version et des documents de livraison ;
- crée uniquement un **brouillon** GitHub Release, avec tag préexistant et checklist jointe ;
- ne déploie rien, ne publie rien et ne modifie pas la visibilité du dépôt.

La présence de documents n'atteste pas leur validation : les checks CI, les
cases QA, les notices et l'accord du mainteneur restent à contrôler avant le
tag et avant publication du brouillon. Un relancement n'écrase pas une release
existante. Si `main` a avancé, ne pas retagger : examiner la situation avec le
mainteneur avant de relancer.

Dans le brouillon, remplacer les notes préparatoires par celles de la version
finale, joindre les liens de déploiement/QA, puis publier **sur instruction
explicite**. Rendre le dépôt public est une décision distincte, jamais un
effet secondaire de ce workflow.

Référence vérifiée : [GitHub CLI — création de release](https://cli.github.com/manual/gh_release_create)
(`--draft`, `--verify-tag`). Le guide de livraison utilisé a conduit à garder
préparation, validation et promotion séparées, sans déploiement automatique ajouté.
