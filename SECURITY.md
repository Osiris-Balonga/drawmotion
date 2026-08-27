# Security

DrawMotion is a prototype without a maintained public release yet.
Do not post webcam data or sensitive information in an issue.

The intended private channel is [Report a vulnerability](https://github.com/Osiris-Balonga/drawmotion/security/advisories/new).
Its activation must be verified before the repository becomes public: the API
check on August 27, 2026 returned 404 and did not confirm availability. If the
link is unavailable, ask the maintainer to enable private reporting without
disclosing the vulnerability in a public issue. No response or fix deadline
is guaranteed.

A useful report includes the commit, browser, reproduction steps, and impact,
using synthetic data. Do not attach personal recordings or secrets.

## GitHub checks

- CI covers formatting, linting, TypeScript, tests/coverage, local assets,
  builds, JS/CSS budgets, and Chromium journeys including real inference under CSP.
- `security.yml` audits production **and** development dependencies, blocking
  on known high/critical vulnerabilities. Network errors are not ignored and
  do not mean the repository is safe.
- Dependabot checks npm and GitHub Actions weekly, targeting `dev`.
- CodeQL JavaScript/TypeScript analysis and dependency review use SHA-pinned
  actions, minimal permissions, and no `pull_request_target`.

For a private repository, CodeQL and dependency review require GitHub Code
Security eligibility and activation. They are **disabled by default**, with an
explicit workflow notice. Set the repository variable
`CODE_SECURITY_ENABLED=true` only after confirming eligibility and enabling
the features. The workflow allows them on public repositories. Do not enable
CodeQL default setup alongside this advanced workflow without following
GitHub's migration procedure.

Workflow files are not evidence of successful GitHub execution. Check remote
runs and required checks on the candidate commit before publication.

See [COMPATIBILITY.md](docs/COMPATIBILITY.md) for local timings, processed data,
and required CSP exceptions.

References: [private CodeQL eligibility](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/private-repository-enablement),
[dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review),
[CodeQL Action license](https://github.com/github/codeql-action#license).
