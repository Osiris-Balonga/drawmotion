# Sécurité

DrawMotion est un prototype, sans version publique maintenue pour le moment.
Ne publiez pas de données de webcam ou d'informations sensibles dans une issue.
Pour signaler une vulnérabilité, contactez le mainteneur par un canal privé
déjà convenu ; après ouverture du dépôt, utilisez « Report a vulnerability »
si cette fonction est activée. Aucun délai de correction n'est garanti.

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
GitHub. Les résultats distants et checks obligatoires seront vérifiés après
un push autorisé, sans modifier ici abonnement ou visibilité.

Les timings locaux, données traitées et exceptions CSP nécessaires sont
décrits dans [COMPATIBILITY.md](./docs/COMPATIBILITY.md).

Sources : [éligibilité CodeQL privé](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/private-repository-enablement),
[dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review),
[licence CodeQL Action](https://github.com/github/codeql-action#license).
