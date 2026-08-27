# ADR 0002 — Git and release strategy

Date: 2026-08-25

Status: accepted

## Context

The project should progress in reviewable batches, not appear on GitHub as
an entire application pushed in a single commit.

## Decision

- The initial direct commit contains only governance and documentation.
- All later capabilities use short-lived branches and pull requests.
- `dev` is the default integration branch.
- `main` is the branch intended for public production deployment.
- Short-lived branches target `dev`, preserving atomic commits through rebase merge.
- An action rejects PRs targeting `main` unless the source branch is exactly `dev`.
- Promotions from `dev -> main` use an explicit merge commit.
- Release tags point only to `main`.

## Consequences

Batches are sequential. An agent prepares a PR and merges only with explicit
maintainer authorization. Hotfixes also go through `dev`, followed by the same
controlled promotion to `main`. This follows the PlotTwist repository's model
while preserving DrawMotion's atomic commits.
