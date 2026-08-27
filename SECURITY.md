# Sécurité

DrawMotion est un prototype, sans version publique maintenue pour le moment.
Ne publiez pas de données de webcam ou d'informations sensibles dans une issue.
Le canal prévu est [Report a vulnerability](https://github.com/Osiris-Balonga/drawmotion/security/advisories/new),
qui envoie un signalement privé au mainteneur. Son activation doit être
vérifiée avant l'ouverture du dépôt : le contrôle API du 27 août 2026 renvoie
404 et ne permet pas de la confirmer. Si le lien n'est pas disponible,
demandez au mainteneur d'activer le canal, sans divulguer la faille dans une
issue publique. Aucun délai de correction n'est garanti.

Un signalement utile précise le commit, le navigateur, les étapes et l'impact,
avec des données synthétiques. Ne joignez pas de vidéo personnelle ni de secret.

## Contrôles prévus dans GitHub

- CI existante : format, lint, TypeScript, tests/couverture, assets locaux,
  build, budgets JS/CSS, parcours Chromium incluant vraie inférence sous CSP.
- `security.yml` : audit des dépendances de production **et** développement,
  bloquant sur les vulnérabilités connues high/critical. Une erreur réseau
  n'est pas ignorée et ne signifie pas que le dépôt est sain.
- Dependabot existe déjà pour npm et GitHub Actions, chaque semaine vers `dev`.
- CodeQL JavaScript/TypeScript et dependency review sont préparés avec des
  actions épinglées par SHA, permissions minimales et sans `pull_request_target`.

Sur un dépôt privé, ces deux derniers outils nécessitent une éligibilité
GitHub Code Security et leur activation. Ils sont **désactivés par défaut**,
avec un avis explicite dans le workflow. Le mainteneur ne doit définir la
variable de dépôt `CODE_SECURITY_ENABLED=true` qu'après vérification de
l'offre et activation des fonctionnalités. Sur dépôt public, les conditions
permettent leur exécution. Ne pas configurer simultanément CodeQL default
setup et ce workflow advanced setup sans suivre la procédure GitHub.

Les fichiers de workflows ne constituent pas une preuve d'exécution sur
GitHub. Vérifier les runs distants et les contrôles obligatoires sur le commit
candidat avant chaque publication.

Les timings locaux, données traitées et exceptions CSP nécessaires sont
décrits dans [COMPATIBILITY.md](./docs/COMPATIBILITY.md).

Sources : [éligibilité CodeQL privé](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/private-repository-enablement),
[dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review),
[licence CodeQL Action](https://github.com/github/codeql-action#license).
