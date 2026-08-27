# Archive — Initial implementation plan

> Historical document, archived on August 27, 2026. The decisions below describe
> the original implementation sequence, not current contribution instructions.
> Some were superseded, including state management, interfaces, and test grouping.
> Use [CONTRIBUTING](../../CONTRIBUTING.md), the [current architecture](../ARCHITECTURE.md),
> and the [release guide](../RELEASE.md) for current work.
> Statements such as "source of truth" below belong to the historical plan.

---

Original status: approved plan, to be executed sequentially.

Product: web technology demo for hand-controlled 2D drawing.

UX direction: option C, guided tutorial followed by a minimal canvas.

Status recorded on August 27, 2026: functional prototype, batch 9 foundations,
and local batch 10 implementation. Batch 10 still needed qualification on an
HTTPS preview and a physical webcam before final QA and delivery (batch 11).
Local batch 11 preparation had started: checklist, candidate version, and
release procedure. This was neither final validation nor publication approval.
Batch 9 gesture additions used simulated Chromium landmarks, not MediaPipe
validation against real video. Merging, required GitHub checks, and publication
still needed maintainer approval; passing local tests did not constitute delivery.

## 1. Original execution rules for agents

This document was the plan's source of truth. An agent worked on one batch at a time.

1. Read this plan, `PRODUCT.md`, `DESIGN.md`, and applicable ADRs before changes.
2. Verify that the previous batch has merged into `dev`.
3. Update `dev` and create the specified branch.
4. Change only files and responsibilities belonging to the current batch.
5. Commit in the specified order. Each commit must compile and serve one purpose.
6. Run `pnpm validate` before each push, plus batch-specific checks.
7. Push the branch and open a draft PR after the first commit.
8. Complete the PR checklist, attach evidence, and mark it ready for review.
9. Never merge your own PR without explicit authorization. Stop when checks are
   green and the PR is ready unless the maintainer requests further work.
10. Never push directly to `dev` or `main`, except for the initial batch 0 bootstrap.

Original prohibitions:

- No `--force` or history rewriting after review starts.
- No dependency without PR justification.
- No `dist/`, coverage, Playwright reports, or secrets in Git.
- No Radix primitives/packages; shadcn components must use Base UI.
- No MediaPipe, Canvas, or camera logic inside React components.
- No video coordinates written into Zustand on every frame.
- No production CDN for model/WASM files.
- No destructive gesture without explicit confirmation.
- No merge before prescribed manual checks.

## 2. Locked stack

| Area        | Choice                                                                     |
| ----------- | -------------------------------------------------------------------------- |
| Runtime     | Node.js 24 LTS, pinned through `.nvmrc` and `package.json#engines`         |
| Packages    | pnpm, exact version in `packageManager`                                    |
| Application | React 19, strict TypeScript, Vite 8                                        |
| Styling     | Exact Tailwind CSS 4.3.x versions with `@tailwindcss/vite`                 |
| Components  | shadcn/ui CLI v4, Base Nova, Base UI primitives, committed sources         |
| Icons       | Lucide React                                                               |
| Vision      | `@mediapipe/tasks-vision`, Hand Landmarker, local processing               |
| Drawing     | Native two-layer Canvas 2D                                                 |
| UI state    | React hooks at the time of archival; imperative resources outside UI state |
| Testing     | Vitest, Testing Library, Playwright, axe-core                              |
| Quality     | ESLint, Prettier, TypeScript, Vitest coverage                              |
| CI          | GitHub Actions                                                             |
| Deployment  | Vercel PR previews; production only from `main`                            |

Version rule: batch 1 resolves compatible stable versions and pins them exactly
in `package.json` and `pnpm-lock.yaml`. Later batches do not use `latest`
outside a dedicated upgrade.

## 3. Original target architecture

This tree is historical, not the current file inventory.

```text
src/
  app/
    App.tsx
    providers.tsx
  components/
    ui/                         # project-owned shadcn sources
  features/
    camera/
    onboarding/
    toolbar/
    workspace/
  core/
    drawing/                    # strokes, commands, history
    gestures/                   # pure landmark interpretation
    geometry/                   # coordinate mapping and transforms
  infrastructure/
    camera/                     # getUserMedia and MediaStream lifecycle
    mediapipe/                  # Hand Landmarker adapter
    persistence/                # local preferences only
  workers/
    hand-tracker.worker.ts
    protocol.ts
  stores/
    draw-store.ts
  styles/
    globals.css
  test/
    fixtures/
    setup.ts
public/
  models/
  wasm/
e2e/
docs/
  adr/
  qa/
scripts/
```

Required pipeline in the original plan:

```text
Webcam -> MediaPipe Worker -> landmarks -> gesture engine
       -> intentions -> drawing engine -> Canvas
                                  |-> UI store -> React
```

React presents the interface. The Worker produces landmarks, the gesture engine
produces intentions, and the drawing engine executes them. Modules must not
skip layers.

## 4. Git and GitHub model

### Long-lived branches

- `dev`: default integration branch, always buildable and tested; target of development PRs.
- `main`: production branch, receiving only promotion PRs whose source is exactly `dev`.

### Short-lived branches

- `chore/<topic>`: tooling.
- `feat/<topic>`: product capability.
- `fix/<topic>`: correction.
- `docs/<topic>`: documentation only.
- `release/vX.Y.Z`: release preparation before integration into `dev`.
- `hotfix/<topic>`: public-production emergency, created from `dev` and promoted with it.

### Commits

Use Conventional Commits: `chore`, `feat`, `fix`, `test`, `docs`,
`refactor`, `perf`, and `ci`.
Commit immediately after completing one purpose and passing its relevant tests,
rather than waiting for the entire batch.

### Pull requests

- Draft PR after the first commit.
- Target fewer than 500 changed business-logic lines, excluding lockfiles,
  generated shadcn components, and binary models.
- Prefer rebase merge into `dev` to retain atomic commits.
- Use a merge commit for `dev -> main` to make release boundaries explicit.
- Keep all three merge methods available to the maintainer, as in PlotTwist.
- Do not automatically delete merged branches.
- Do not start the next PR before the previous one merges, except for an
  explicitly authorized, conflict-free documentation fix.

### Protecting dev

After the first push, enable PR requirements, resolved conversations, blocked
force pushes/deletions, and no bypasses. Require a human approval once a second
maintainer is available.

After each workflow's first successful run, add these required checks:
`quality`, `unit-tests`, `build`, `e2e-chromium` from batch 9, and
`Vercel` or the exact preview check name after its first run.

### Protecting main

Require a PR sourced exactly from `dev` and the `Production source policy`
check. Do not require linear history, so promotion merge commits remain possible.
Use a manually approved GitHub `production` environment if the plan supports it.
Require a successful Vercel deployment before closing the release.

Some protections may be unavailable for private repositories on GitHub Free.
In that case, follow them by convention and enable enforcement when the
repository becomes public or the plan supports it.

## 5. Required package scripts

Historical contract, updated during the test cleanup.
See [TESTING](../TESTING.md) and current `package.json` for current commands.

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint . --max-warnings=0",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc -b --pretty false",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:unit": "vitest run --project unit",
  "test:components": "vitest run --project components",
  "test:integration": "vitest run --project integration",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:all": "pnpm test && pnpm test:e2e",
  "validate": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:all"
}
```

Do not weaken `validate` to pass a PR. The Playwright test server builds the
application before browser journeys.

## 6. GitHub Actions workflows

These were planning requirements; consult the actual workflows for implementation.

### CI

`.github/workflows/ci.yml` runs on PRs targeting `dev` or `main`, and pushes
to `dev`. Default permissions are `contents: read`; add permissions only to
jobs that need them. Group concurrency by workflow and branch, cancelling
superseded PR runs.

Keep job names stable:

1. `quality`: checkout, Node 24, pnpm from `packageManager`, pnpm cache,
   frozen install, format check, lint, and typecheck.
2. `unit-tests`: same setup, `pnpm test:coverage` for unit/component/integration
   tests once; retain coverage artifacts for 14 days.
3. `build`: same setup, MediaPipe checksums, `pnpm build`;
   retain `dist` for seven days.
4. `e2e-chromium`: foundation introduced during test cleanup, extended in batch 9;
   depends on `build`, installs Playwright Chromium and system dependencies,
   downloads `dist`, runs `pnpm test:e2e` with `E2E_USE_BUILD=1`,
   and uploads reports/traces/screenshots on failure.

The original plan required maintained major action versions at bootstrap.
Never use an unfamiliar action without checking its provenance.

### Production source policy

`.github/workflows/production-source.yml` runs for every PR targeting `main`.
The stable `Production source policy` job fails unless `github.head_ref`
is exactly `dev`; releases must not bypass it.

### Security

The original `security.yml` plan specified JavaScript/TypeScript CodeQL on
PRs, `dev`, `main`, and Mondays; dependency review on PRs; minimal permissions;
and no repository writes. See current `SECURITY.md` for private-repository
eligibility and actual enabled checks.

### Dependabot

Check npm/pnpm and GitHub Actions every Monday, targeting `dev`.
Group minor development updates. Never automatically merge MediaPipe, Vite,
React, Tailwind, or Playwright updates.

### Release

The original `release.yml` plan reacted to `v*.*.*` tags on `main`,
verified ancestry, reran validation/E2E, created release notes, and attached
asset checksums and a build report. It did not redeploy because Vercel deploys
`main`.

**Superseded:** the current workflow creates a draft only and has different
tag/version checks. Follow [RELEASE](../RELEASE.md), not this historical sequence.

## 7. Vercel deployment plan

After batch 1: connect GitHub, select the Vite preset, use
`pnpm install --frozen-lockfile`, `pnpm build`, and output `dist`.
Production comes from `main`; PRs receive previews. Attach a public domain
only in batch 11.

Add and actually test these headers in `vercel.json`:

- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- CSP allowing only local resources and necessary Worker/WebAssembly execution.

Derive CSP from the real build instead of copying an untested policy.
The original target included `default-src 'self'`, `worker-src 'self' blob:`,
and only the necessary WebAssembly permission.

## 8. Implementation batches

Each planned batch started from the previous batch merged into `dev`, with
a PR targeting `dev`.

### Batch 0 — Minimal governance and first push

No branch: the sole exception allowed local work on `main` before creating
`dev`. Create only `.gitignore`, `.gitattributes`, `.editorconfig`,
`.nvmrc`, a pre-implementation README, `PRODUCT.md`, `DESIGN.md`, this plan,
and ADRs 0001/0002.

Exact commit: `chore(repo): initialize DrawMotion governance`.

Then create an empty private GitHub repository without a generated README,
push only that commit, create/default to `dev`, target development PRs there,
and enable available protections. No later direct pushes to `dev` or `main`.

Exit criterion: the remote contains governance only, with no application code.

### Batch 1 — Reproducible bootstrap

Branch: `chore/bootstrap-app`

PR: `chore: bootstrap the DrawMotion web application`

Ordered commits:

1. `chore(app): scaffold React TypeScript with Vite`
   - Initialize Vite in the existing directory; pin Node 24 and pnpm.
   - Enable strict TypeScript and `@/* -> src/*`; remove Vite demo content.
2. `chore(ui): configure Tailwind CSS and shadcn`
   - Pin Tailwind 4.3.x and `@tailwindcss/vite`; import Tailwind in globals.
   - Original bootstrap command: `pnpm dlx shadcn@latest init -d --base base`.
   - Verify Base Nova, CSS variables, aliases, and `rsc: false`.
   - Verify Base UI in `components.json`; no `@radix-ui/*` or `radix-ui`.
   - Generate only button and tooltip initially.
3. `chore(quality): add static analysis and unit test harness`
   - ESLint, Prettier, Vitest, Testing Library, jsdom, contract scripts, App smoke test.
4. `ci: validate pull requests with GitHub Actions`
   - CI workflow, PR template, and CODEOWNERS where relevant.

Checks: `pnpm validate`, then GitHub `quality`, `unit-tests`, and `build`.
After merging, require all three jobs on `dev`.

### Batch 2 — Design system and direction C shell

Branch: `feat/guided-workspace-shell`

PR: `feat: establish the guided DrawMotion workspace`

Ordered commits:

1. `feat(ui): define DrawMotion semantic design tokens`
   - Dark Base Nova OKLCH theme; violet accent, green success, orange warning.
   - WCAG AA contrast, reduced motion, no gradients/glassmorphism.
2. `feat(ui): add accessible workspace primitives`
   - Generate alert-dialog, badge, dialog, popover, progress, separator, slider,
     sonner, toggle-group, and tooltip.
   - No generic Card wrappers; one tooltip provider.
3. `feat(workspace): build the responsive drawing shell`
   - Top bar, empty Canvas, left tool rail, simulated circular camera,
     bottom guidance, layouts at 1280×720, 1440×900, and 1920×1080.
4. `test(ui): cover workspace keyboard and accessibility states`.

Exit criteria: no real engine yet; commands explicitly disabled or simulated;
attach screenshots at all three resolutions.

### Batch 3 — Camera, privacy, and errors

Branch: `feat/camera-lifecycle`

PR: `feat: add privacy-first camera lifecycle`

Ordered commits:

1. `test(camera): specify camera lifecycle states`
   - Cover idle, requesting, ready, denied, missing, busy, failed, and stopped.
2. `feat(camera): implement the MediaStream adapter`
   - Wrap getUserMedia; request video only.
   - Stop all tracks on unmount and background pausing.
   - Prefer the front camera at an ideal 1280×720.
3. `feat(camera): add permission and recovery experience`
   - Camera activation, local/non-recorded explanation, actionable errors,
     and selection among multiple devices.
4. `test(camera): verify mocked permission flows`.

Manual checks: allowed, denied, revoked during use, missing webcam, and webcam
occupied by another application.

### Batch 4 — MediaPipe in a Worker

Branch: `feat/hand-tracking-worker`

PR: `feat: detect hand landmarks off the main thread`

Ordered commits:

1. `chore(vision): vendor verified MediaPipe runtime assets`
   - Pin tasks-vision; host model/WASM locally; document source URLs,
     licenses, versions, and SHA-256; add the asset verification script.
2. `test(vision): define the tracker port and worker protocol`
   - Versioned INIT, FRAME, RESULT, METRICS, ERROR, DISPOSE messages.
   - Deterministic landmark fixtures and a fake tracker.
3. `feat(vision): run Hand Landmarker in a dedicated worker`
   - VIDEO mode, at most one inference in flight, stale-frame dropping,
     ImageBitmap transfer, and clean Worker disposal.
4. `feat(vision): render tracking status and landmark overlay`
   - Mirrored-camera alignment, reliable/uncertain/lost states,
     development-only metrics.
5. `test(vision): cover initialization failure and worker disposal`.

Exit criteria: no third-party network requests after loading, usable UI during
inference, and no Worker/MediaStream leaks.

### Batch 5 — Gesture engine

Branch: `feat/gesture-engine`

PR: `feat: translate hand landmarks into stable gestures`

Ordered commits:

1. `test(gestures): specify gesture classification fixtures`
   - Pinch, open hand, fist, uncertain hand, tracking loss, threshold regressions.
2. `feat(gestures): classify pinch open-hand and fist states`
   - Palm-normalized distances, separate entry/exit hysteresis,
     centralized and documented thresholds.
3. `feat(gestures): smooth pointer motion and map coordinates`
   - Temporal filter, mirrored-camera mapping, last reliable position,
     no extrapolation after hand loss.
4. `feat(gestures): emit versioned drawing intentions`
   - POINTER_MOVE, DRAW_START, DRAW_MOVE, DRAW_END, PAUSE, TRACKING_LOST;
     pure, testable state machine.
5. `test(gestures): cover jitter and accidental activation resistance`.

Exit criterion: a stationary hand near a threshold must not rapidly alternate
between drawing and pausing.

### Batch 6 — Canvas engine and history

Branch: `feat/canvas-engine`

PR: `feat: add the two-layer drawing engine`

Ordered commits:

1. `test(drawing): specify strokes commands and history behavior`
   - Stroke model, normalized points, tool/color/width, bounded history,
     redo invalidation after a new action.
2. `feat(drawing): implement immutable drawing commands`
   - Add/erase/clear/undo/redo operations independent of the DOM.
3. `feat(canvas): render persistent and interaction layers`
   - Persistent drawing layer and pointer/preview layer;
     requestAnimationFrame and device pixel ratio.
4. `feat(canvas): connect gesture intentions to drawing commands`
   - No React rerender per frame; end the stroke on tracking loss.
5. `test(canvas): verify resize replay and high-DPI rendering`.

Exit criteria: strokes survive resizing, deterministic undo/redo, and a
60 Hz visual target even when detection is slower.

### Batch 7 — Guided direction C onboarding

Branch: `feat/guided-onboarding`

PR: `feat: teach DrawMotion through five validated missions`

Ordered commits:

1. `test(onboarding): specify the five-mission progression`.
2. `feat(onboarding): validate cursor drawing styling shapes and undo`
   - Aim at three targets, then pinch/draw/release.
   - Open commands with a peace sign (index and middle fingers raised),
     select green and a thickness, regularize a shape, and undo.
   - Back, skip, and replay controls.
3. `feat(onboarding): add contextual gesture guidance`
   - Non-blocking bottom panel, dismissed on success; local illustrations.
   - Tutorial replay in the dock.
   - Disable gesture-menu opening during pointer/drawing missions.
4. `feat(onboarding): persist completion locally`
   - Versioned, resettable storage with no biometric or video data.
5. `test(onboarding): verify keyboard fallback and reduced motion`.

Target: a new user reaches the canvas in under two minutes without external help.

### Batch 8 — Complete tools and export

Branch: `feat/drawing-tools-export`

PR: `feat: complete drawing controls and PNG export`

Ordered commits:

1. `feat(tools): add pen eraser color and thickness controls`
   - Mouse/keyboard controls and announced active states.
   - Pinch selection only in the dedicated gesture palette, not the dock.
   - Shared settings, separate eraser width; dock-only custom HEX/RGB color.
2. `feat(history): expose undo redo and clear-canvas actions`
   - Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z; shadcn AlertDialog before clearing;
     disable inapplicable actions.
3. `feat(export): download the canvas as PNG`
   - Explicit white background, physical Canvas resolution,
     filename `drawmotion-YYYY-MM-DD-HHmmss.png`, Sonner success/failure feedback.
4. `feat(shortcuts): add tool and viewport keyboard commands`
   - P for pen, E for eraser, Space + drag for pan;
     disable shortcuts while an editable control has focus.
5. `test(tools): cover destructive confirmation and export behavior`.

Exit criterion: common settings work via mouse/keyboard and gesture commands.
HEX/RGB deliberately remains outside gesture control. Drawing itself still
requires hand tracking.

### Batch 9 — E2E, accessibility, and robustness

Branch: `test/end-to-end-hardening`

PR: `test: harden DrawMotion end to end`

Ordered commits:

1. `test(e2e): configure deterministic gesture camera fixtures`
   - Chromium's built-in fake video device and automatic permission.
   - Test Worker serving synthetic landmarks; real MediaStream, ImageBitmap
     transfers, classification, filters, and engine.
   - No personal video or shipped test hooks.
   - MediaPipe/WASM is replaced here; verify assets, performance, and accuracy
     separately with a physical camera before release.
2. `test(e2e): cover first-run drawing and PNG export`
   - Camera, five missions, persistence, drawing, erasing, undo/redo, PNG.
   - Real pinch selection of color/width.
   - Canvas pixels and downloaded/decoded PNG assertions.
3. `test(e2e): cover camera failures and tracking loss`.
4. `test(a11y): enforce automated accessibility checks`
   - axe-core on tutorial, stroke settings, custom color, and commands.
   - Keyboard popover flow: Tab, arrows, selection, Escape, restored focus.
   - Complementary manual screen-reader, focus, and zoom checks.
5. `ci: require Chromium end-to-end tests`
   - `e2e-chromium` job and failure artifacts.

The job was configured; scope and limitations are in `docs/TESTING.md`.
After its first green GitHub run and maintainer approval, require it on `dev`.
Local tests do not configure GitHub required checks.

### Batch 10 — Security, performance, and compatibility

Local implementation included bounded pre-transfer queues, bounded development
diagnostics, accessible settings at 200%-equivalent viewports, scrollable panels,
reduced-motion feedback, explicit tracking errors, real Worker/WASM CSP checks,
JS/CSS budgets, and a security workflow. Existing Dependabot was retained.
CodeQL/dependency review depended on private-repository eligibility; see
`SECURITY.md`. Local results did not imply publication or remote execution.

Commits remained on the existing working branch with earlier local batches.
Do not artificially recreate branches from an unmerged `dev`. Resuming
sequential PRs required maintainer approval. See `docs/COMPATIBILITY.md`.

Planned branch: `chore/production-hardening`

PR: `chore: harden DrawMotion for production`

Ordered commits:

1. `perf(vision): enforce frame backpressure and collect diagnostics`
   - At most one pending frame; development detection FPS and median/p95 latency;
     no remote telemetry.
2. `fix(responsive): harden supported desktop viewport layouts`
   - Desktop/tablet, including 782×600 and 768×1024 in Chromium.
   - Actionable mobile compatibility message, not a mobile support promise.
   - Controls usable at 200% browser zoom.
3. `chore(security): add restrictive production headers`
   - vercel.json and header smoke check; preview-tested Worker/WASM CSP.
4. `ci(security): add CodeQL dependency review and Dependabot`.
5. `docs(compatibility): document browsers privacy and troubleshooting`.

Exit targets: no console errors during normal use, no network activity after
local assets load, analyzed application bundle with justified major regressions,
stable tracking on recent Chrome/Edge, and explicit fallback elsewhere.

### Batch 11 — Release candidate and v1.0.0 delivery

Planned branch: `release/v1.0.0`, from `dev`

PR to `dev`: `chore: prepare DrawMotion v1.0.0`

Promotion PR from `dev` to `main`: `release: DrawMotion v1.0.0`

Ordered commits:

1. `docs(release): add v1 manual QA checklist`
   - `docs/qa/v1.0.0.md`; Chrome/Edge, Windows/macOS where available;
     permission, low lighting, out-of-frame hand, export.
2. `chore(release): prepare version 1.0.0`
   - Package version, changelog, final README, privacy and third-party notices.
3. `fix(release): resolve v1 release candidate findings`
   - Only when needed, with each fix linked to its QA entry.

Original procedure: open preparation PR to `dev`; wait for CI and Vercel
preview; perform physical-webcam QA; merge only with a completed checklist;
freeze new application merges during promotion; open `dev -> main` without
extra changes; verify CI/preview and merge; verify production/headers;
attach the public domain; create and push annotated `v1.0.0` on `main`;
retain QA/deployment links in the release.

The original plan described immediate GitHub Release creation. The current
draft-only workflow and separate publication approval supersede that step;
use [RELEASE](../RELEASE.md).

## 9. Coverage and test strategy

Global Vitest thresholds at archival: 80% lines, functions, and statements;
75% branches.

Initial domain-specific goals (95% lines / 90% branches for gestures/drawing,
90% lines for camera) were not configured thresholds. Do not claim CI enforces
them. Cleanup did not lower existing thresholds.
See `docs/TESTING.md` for grouping, commands, and criteria for adding tests.

Tests should verify behavior, not React internals. Visual snapshots do not
replace functional assertions. CI webcam input is simulated; a physical webcam
remains mandatory for release-candidate validation.

## 10. Original definition of done

The v1 target required:

- A new user understands the gestures and finishes five missions in under two minutes.
- Pen, eraser, colors, thickness, clear, undo/redo, and PNG export work.
- Hand loss ends a stroke without artifacts.
- Video and landmarks never leave the device.
- Runtime assets are local and verified.
- Mouse/keyboard provide fallback controls.
- Required GitHub checks are green.
- Physical-webcam QA is signed off.
- `main` matches the `v1.0.0` tag.
- A rollback to the previous Vercel deployment is documented and exercised.

These are original acceptance targets, not a statement that they were met.

## 11. Post-release hotfix workflow

1. Create `hotfix/<topic>` from `dev`.
2. First add a reproducing test; commit `test: reproduce <defect>`.
3. Fix it; commit `fix: resolve <defect>`.
4. Open a PR to `dev`, run CI, and obtain approval.
5. Merge into `dev`, then open `dev -> main`.
6. After CI, approval, and deployment verification, release/tag `v1.0.1` on `main`.
7. Never fix `main` directly; `dev` remains the source of promotions.

## 12. Original technical references

- [Vite](https://vite.dev/guide/)
- [Tailwind CSS with Vite](https://tailwindcss.com/docs/installation/using-vite)
- [shadcn/ui with Vite](https://ui.shadcn.com/docs/installation/vite)
- [MediaPipe Hand Landmarker Web](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [Playwright CI](https://playwright.dev/docs/ci)
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Vercel Git integration](https://vercel.com/docs/git)
