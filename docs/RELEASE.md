# Releasing DrawMotion

## Candidate status

`1.0.0-rc.1` is a **public demo candidate**, not completed final QA.
Publishing the demo does not create a stable release. Do not tag it or change the version to
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
   remote CI. Preserve atomic commits. GitHub Pages has no automatic PR previews;
   test the CI build locally when a pre-production preview is needed.
4. Complete [v1 QA](qa/v1.0.0.md) against the demo's exact SHA using a
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
   drawing, PNG, and `pnpm verify:deployment <HTTPS-URL>/`.

GitHub Pages is deployed by the `deploy-pages` job in `ci.yml`, on `main` only.
It depends on quality, unit coverage, build, Chromium, and PWA jobs and publishes
the exact tested artifact, not a fresh rebuild. Pages uses the `github-pages`
environment with short-lived GitHub OIDC credentials; no deployment token is
stored in the repository. Repository Settings > Pages must use GitHub Actions.
The maintainer explicitly authorized the public repository and candidate demo
on August 27, 2026; this is not approval to tag or publish a stable 1.0 release.

### Search and sharing configuration

The Vite build injects initial-HTML Open Graph/Twitter metadata, a canonical
URL, and factual WebApplication structured data. It generates a one-page sitemap
for indexable builds and `robots.txt` only for origin-root hosting. No ratings or release claims are
invented. The existing approved logo is used for social previews.

- `SITE_URL` supplies the complete HTTPS site URL, including a trailing slash
  and any project subpath. CI uses `https://osiris-balonga.github.io/drawmotion/`.
  Vite's base path, model/image URLs, canonical and sitemap share that base.
  Change the workflow value for a custom domain or fork.
- Preview/development environments receive `noindex`; builds without a public
  origin also receive `noindex` and omit canonical URLs and the sitemap.
  A `DEPLOY_ENV=production` build fails if `SITE_URL` is missing.
- Never use a temporary deployment URL as the canonical domain. Rebuild after
  changing domains. `DEPLOY_ENV=preview` excludes a build from indexing;
  robots rules are not authentication.
- Indexable builds allow crawling so search engines can read page metadata.
  A project-subpath build does not emit a misleading `/drawmotion/robots.txt`:
  crawlers read robots rules only at the origin root, which this repo does not own.
  Unknown paths must return 404, not rewrite every URL to the canvas.
- The app has one URL and browser-selected translations, not five crawlable
  language routes. Do not add fictitious `hreflang` alternatives. Dedicated
  localized landing URLs would be a separate enhancement.
- After production approval, verify the canonical, image, sitemap, and HTTP
  robots headers on the live domain. Submit `/drawmotion/sitemap.xml` in the owner's
  Google Search Console account after domain verification. Deployment does
  not guarantee indexing or ranking.

Local production-metadata check: set `SITE_URL` to a test HTTPS site URL, run
`pnpm test:e2e seo.spec.ts`, then unset it. Do not deploy that test build.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages),
and [Open Graph](https://ogp.me/).

## 3. Rollback

Before release, record the previous known-good production deployment URL/ID and
the current SHA. A first production release has no previous known-good version:
record that limitation and exercise the scenario in staging before claiming
rollback has been validated.

With maintainer approval, revert the offending change through `dev`, promote
to `main`, and let CI deploy the rebuilt artifact. Recheck the page, camera,
PNG, and deployment verification. Record the date, URL, SHA, and outcome.
A written procedure is not an executed rollback test. Do not move published
tags or force-push to undo a release.

Once a PWA is distributed, rollback must also ship a corrected worker at the
same `sw.js` URL and scope. Removing the worker file or reverting to pre-PWA
HTML alone can strand existing installations on cached code. Prefer a forward
fix with the normal cache revisions and a compatible drawing schema. Do not
force activation, purge Local Storage, or delete unrelated origin caches.
Existing windows must close before the fix activates; offline clients cannot
receive it until they reconnect. Validate rollback using two built versions
and record the result separately from the normal A/B upgrade test.

Before promoting PWA changes, complete the
[offline release checks](qa/v1.0.0.md#offline-release-checks). The CI `pwa` job
is a deployment dependency; add it to repository-required PR checks through
maintainer-approved settings if branch protection uses an explicit list.

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
