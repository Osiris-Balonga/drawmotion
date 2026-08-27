# Releasing DrawMotion

## Candidate status

`1.0.0-rc.1` is a **local, unpublished** candidate. It identifies release
preparation, not completed final QA. Do not tag it or change the version to
`1.0.0` before maintainer approval.

Create the release branch from `dev` after validated changes have been
integrated. If work remains on a feature branch, integrate it through a PR
first. Do not release from a stale `dev` or rewrite history.
See the [Git ADR](adr/0002-git-and-release-strategy.md).

## 1. Prepare and test

1. Run `pnpm install --frozen-lockfile` and
   `pnpm exec playwright install chromium`.
2. Run `pnpm validate`, `pnpm test:coverage`, `pnpm verify:vision-assets`,
   `pnpm build`, `pnpm verify:bundle`, and `pnpm audit --audit-level high`.
   The build generates and verifies license notices. Keep heavy operations
   sequential on limited hardware.
3. Once a push is authorized, open PRs toward `dev` in order and wait for
   remote CI and the HTTPS preview. Preserve atomic commits.
4. Complete [v1 QA](qa/v1.0.0.md) against the preview's exact SHA using a
   physical webcam. Fix failures in targeted `fix(release): ...` commits
   referencing the QA ID, then retest. Do not retune gestures without a defect.
5. Review [licenses and notices](THIRD_PARTY.md) before publicly distributing
   assets.

## 2. Prepare promotion

After QA and explicit maintainer approval:

1. On the release branch from the integrated `dev`, set version `1.0.0`,
   add its dated changelog entry, and update README status.
   Commit: `chore(release): prepare version 1.0.0`.
2. Attach CI, QA, and preview links to the PR toward `dev`; obtain review and
   merge approval. The final version must also pass CI.
3. Freeze changes during promotion. Open `dev -> main`, wait for checks, and
   merge only with maintainer approval.
4. Verify the promoted SHA's production deployment: page loading, camera,
   drawing, PNG, and `pnpm verify:security-headers <HTTPS-URL>`.

The intended deployment path is Vercel's Git integration, not a second
concurrent CI deployment. Keep tokens out of files and commands copied into
reports. Local Vite preview is not a Vercel deployment.

## 3. Rollback

Before release, record the previous known-good production deployment URL/ID and
the current SHA. A first production release has no previous known-good version:
record that limitation and exercise the scenario in staging before claiming
rollback has been validated.

With maintainer approval, use Vercel's rollback action to restore the identified
deployment. Recheck the page, camera, PNG, and headers. Record the date, URLs,
SHAs, result, and any return to the candidate. A written procedure is not an
executed rollback test. Do not move published tags or force-push to undo a release.

## 4. Tag and draft GitHub Release

After production and QA approval, the maintainer creates and pushes an
**annotated** `v1.0.0` tag on the validated `main` HEAD, not the working branch.
The `release.yml` workflow:

- Responds to `v*` tags, then rejects non-stable versions.
- Requires an annotated tag equal to `main` HEAD and matching the package version.
- Checks for that version's changelog entry and release documents.
- Creates only a **draft** GitHub Release, using the existing tag and an attached checklist.
- Does not deploy, publish, or change repository visibility.

Document existence does not prove validation. Check CI, QA results, notices,
and maintainer approval before tagging and before publishing the draft.
Reruns do not overwrite an existing release. If `main` has advanced, do not
retag; discuss the situation with the maintainer before rerunning.

Replace preparatory draft notes with final release notes and deployment/QA
links, then publish **only on explicit instruction**. Making the repository
public is a separate decision, never a workflow side effect.

Reference: [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create)
(`--draft`, `--verify-tag`).
