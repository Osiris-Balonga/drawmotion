# ADR 0002 — Git and release strategy

Date: 2026-08-25

Status: accepted

## Context

The project should progress in reviewable batches, not appear on GitHub as
an entire application pushed in a single commit.

## Decision

- The initial direct commit contains only governance and documentation.
- All later capabilities use short-lived branches and pull requests.
- `main` is the repository's default branch and the public production branch.
- `dev` remains the integration branch and the explicit target for development PRs.
- Short-lived branches target `dev`, preserving atomic commits through rebase merge.
- An action rejects PRs targeting `main` unless the source branch is exactly `dev`.
- Promotions from `dev -> main` use an explicit merge commit.
- Release tags point only to `main`.

## Consequences

Updated on August 27, 2026 after public demo approval: the repository default
moves from `dev` to `main` so visitors and clones start on the deployed version.
This does not change the integration or promotion workflow.

Batches are sequential. An agent prepares a PR and merges only with explicit
maintainer authorization. Hotfixes also go through `dev`, followed by the same
controlled promotion to `main`. This follows the PlotTwist repository's model
while preserving DrawMotion's atomic commits.
