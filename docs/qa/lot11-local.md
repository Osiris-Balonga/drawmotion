# Batch 11 — Local preparation on August 27, 2026

Historical report. Status at the time: preparation completed, **release not approved**.

## Changes

- Manual v1 checklist with thirteen journeys and fields for environment, SHA, and evidence.
- Local `1.0.0-rc.1` version, changelog, and explicit README limitations.
- Direct-dependency license inventory; project licensing and redistribution notices were still pending at this stage.
- PR, QA, promotion, rollback, annotated-tag, and separate-publication procedure.
- Tag workflow creating only a draft GitHub Release, with no deployment or visibility change.

The release guide separated validation from promotion. Application files,
gesture thresholds, camera code, dependencies, and lockfile were unchanged.
The RC version was not a published release.

## Checks performed

- Frozen-lockfile installation with scripts disabled: already up to date.
- Prettier: passed.
- TypeScript and Vite build: passed.
- Budgets: JS 655,597 bytes raw / 204,348 gzip; CSS 72,640 bytes, unchanged from batch 10.
- Seven MediaPipe asset hashes: verified.
- Workflow YAML parsed; shell block syntax checked with Bash.
- Metadata: seven in-memory scenarios, including RC rejection, version mismatch, and missing documents/changelog.
- Git guards: four simulated scenarios, including rejection of lightweight tags and tags not at `main` HEAD.
- Release creation: two simulated scenarios, covering a draft with an existing tag and preservation of an existing release.

Workflow tests used fake Git/GitHub functions without remote writes.
They do not establish successful GitHub Actions execution.
The full application suite was not rerun for these documentation, version,
and workflow changes; earlier results are in [batch 10](lot10-local.md).
Run `pnpm validate` before a push.

## Pending at this stage

The [v1 QA](v1.0.0.md) checklist remained open: physical webcam, HTTPS preview,
remote CI, project license, redistribution notices, and a rollback exercise.
The current PNG export scope (visible viewport, not the full document) also
needed acceptance or a fix. Consult the current checklist and license inventory
for subsequent changes; this report is not their current status.

No push, merge, tag, deployment, or visibility change was performed.
