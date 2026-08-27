# Contributing to DrawMotion

Reproducible fixes, documentation improvements, and usage feedback are welcome.
Before introducing a new gesture or redesign, discuss the problem and intended
behavior in an issue.

## Language

Write repository documentation, code identifiers, comments, test descriptions,
commit messages, and pull request descriptions in **English**. This includes
ADRs, QA reports, contributor templates, and archived documentation.

Only user-facing application content is localized, including labels, guidance,
accessibility announcements, and error messages. Tests may quote localized UI
strings when asserting that content; those strings are not documentation.
Do not translate app content as part of a repository documentation change.

## Setup

Use Node.js 24 and pnpm 11.19.0, then:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

No API key is required. MediaPipe assets are included in the repository.
For browser tests, run `pnpm exec playwright install chromium`.
Camera access requires localhost or HTTPS, not a plain HTTP LAN address.

## One change, one purpose

- Create a short-lived branch from `dev` and target `dev` in your PR.
  Do not target `main` directly; production promotion is `dev -> main`.
- Keep commits self-contained. Separate fixes, refactoring, and documentation
  when they serve different purposes. Example: `fix(gestures): stop ink after tracking loss`.
- Explain the problem, solution, risks, and checks actually performed.
  Include a screenshot for visual changes when helpful.
- Justify new dependencies, abstractions, and tests. Reuse settings shared by
  the dock and gesture commands.
- Gesture threshold changes need a reproducible regression test and a webcam
  check: fixtures alone do not establish real-world accuracy.
- Never commit secrets, private screenshots, webcam recordings, builds, coverage,
  or reports. New assets need documented provenance and licensing.
- Wait for maintainer review. Do not merge or publish without approval.

See [ARCHITECTURE](docs/ARCHITECTURE.md) for code boundaries.
UI components use Base UI, not Radix.

## Verification without redundant tests

Start with the affected group: `pnpm test:unit`, `pnpm test:components`,
or `pnpm test:integration`. Browser journeys can be filtered by file:
`pnpm test:e2e gestures.spec.ts --workers=1`.

Before a code PR, run `pnpm validate` and `pnpm test:coverage`.
Documentation-only PRs may use formatting and link checks instead, stating
that scope explicitly. CI also checks the build, assets, budgets, and notices.
Do not hide failures by lowering thresholds.

A test should catch a concrete defect, not restate its own constants or assert
library internals. The [testing guide](docs/TESTING.md) describes mocked
boundaries and required manual checks.

## AI-assisted contributions

Contributors are responsible for understanding and verifying their changes,
respecting licenses, and keeping private data out of tools. AI-assisted PRs
have the same review and evidence requirements as other contributions.
Generated output or reports of tests that were never run are not validation.

## Communication and licensing

Discuss changes, not people. Harassment, publication of personal information,
and deliberately malicious contributions are not acceptable. The maintainer
may hide or close discussions that violate these rules. Abuse on GitHub can
also be reported through its Report content feature.

For vulnerabilities, follow [SECURITY](SECURITY.md), not a public issue.
Original contributions are offered under the [MIT license](LICENSE);
third-party notices must be preserved. No additional CLA or copyright
assignment is required.
