# Testing

## Commands

Requirements: Node 24, pnpm 11, and `pnpm install --frozen-lockfile`.
For browser journeys, install Chromium once:
`pnpm exec playwright install chromium` (add `--with-deps` on Linux/CI).

| Command                          | Scope                                                               |
| -------------------------------- | ------------------------------------------------------------------- |
| `pnpm test:unit`                 | Isolated logic, geometry, adapters, and contracts                   |
| `pnpm test:components`           | Isolated React components, interactions, and semantic accessibility |
| `pnpm test:integration`          | Gesture/drawing pipelines, workspace, and camera lifecycle          |
| `pnpm test`                      | All three Vitest groups, once, then exit                            |
| `pnpm test:watch`                | All three Vitest groups in watch mode                               |
| `pnpm test:watch --project unit` | One group in watch mode                                             |
| `pnpm test:coverage`             | All three groups with shared coverage reporting and thresholds      |
| `pnpm test:e2e`                  | Chromium journeys against the production build                      |
| `pnpm test:all`                  | Vitest followed by Chromium, stopping on failure                    |
| `pnpm validate`                  | Formatting, lint, types, and all tests; E2E includes the build      |

Select multiple groups:
`pnpm exec vitest run --project unit --project integration`.
Filter by file: `pnpm test:unit pinch-detector`.
List files without running: `pnpm exec vitest list --filesOnly`.

Browser subsets are all included in `test:e2e` and `test:all`:

```sh
pnpm test:e2e workspace.spec.ts
pnpm test:e2e gestures.spec.ts
pnpm test:e2e accessibility.spec.ts
pnpm test:e2e security.spec.ts
pnpm test:e2e localization.spec.ts
pnpm test:e2e seo.spec.ts
```

Playwright already filters by file or title (`--grep`); individual scenarios
do not need additional aliases. Vitest does not collect browser test files.

## Grouping and conventions

Tests live near the code. Their suffix assigns each file to one group:

- `src/**/*.test.ts` and `scripts/**/*.test.ts`: unit tests, except `.integration.test.ts`.
- `src/**/*.test.tsx`: components, except `.integration.test.tsx`.
- `src/**/*.integration.test.{ts,tsx}`: integrations of multiple real modules.
- `tests/e2e/**/*.spec.ts`: browser journeys, outside Vitest.

Write test descriptions and comments in English. Assertions against localized
UI content keep the expected application strings.

Existing UI regressions pin French explicitly through `src/test/locale.ts` and
Playwright's `locale` setting, not the developer's operating-system language.
`localization.spec.ts` uses isolated browser contexts for all five languages,
including regional preferences, translated settings, and simulated camera
denial. It saves screenshots under `.artifacts/test-results/` for reviewing
long labels and Chinese glyphs. Resolver tests cover preference order, invalid
tags, English fallback, and catalog completeness/parameter parity.

Core logic and engine integrations run in Node without React or a DOM.
Components use jsdom and Testing Library cleanup. Adapter tests that need DOM
APIs declare `// @vitest-environment jsdom`. React integrations also declare
that environment and import `@/test/setup` for cleanup. Do not enable a global
DOM environment to accommodate one file.

The four integration suites cover the gesture pipeline, the controller with
Canvas rendering, the workspace, and the camera lifecycle hook. Hardware
boundaries (camera, Worker, Canvas encoder) remain mocked in Vitest; these tests
do not validate MediaPipe against a physical webcam.

Vitest uses two workers to limit contention on modest computers. Override
locally with `pnpm test --maxWorkers=4`. Do not compare timings across different
machines, coverage settings, or concurrency levels.

## Deliberately focused browser coverage

- First visit, loaded tutorial illustration, persisted dismissal after reload,
  replay, and stable camera geometry.
- Shared dock/command settings for width, stroke style, color, and eraser,
  including keyboard interaction with the real slider.
- Local drafts survive reload with real raster output, erasing and zoom intact;
  clearing persists, unfinished strokes flush on page hide, and quota failures
  show a warning without disabling export. Enabled controls expose click cursors.
- Collapsible palette and custom color at 782×600 and 768×1024; camera and
  controls stay in view, and HEX values survive reopening.
- Fake camera, all five missions completed through the gesture pipeline,
  pinched color/width selection, persisted completion, fist erasing, undo/redo,
  and PNG download. Assertions inspect drawn and erased pixels, dimensions,
  and the decoded file's white background; an empty export does not pass.
- Tracking loss mid-stroke followed by a distant pinched return: separate
  strokes with no connecting line. Permission denial/retry and camera pausing.
- Axe scans of the tutorial, width/style popover, custom color, and commands.
  Keyboard journeys use Tab, arrows, Space, and Escape, checking selection and
  focus restoration.

Tests use fresh isolated Chromium contexts, with no physical camera, account,
personal profile, or changes to the development server. Playwright builds and
serves the app at `127.0.0.1:4175`, using the path in `SITE_URL` when configured,
then stops its server. CI exercises `/drawmotion/`, including actual Worker/model
loading. The port must be free;
existing servers are not reused. Failure traces/screenshots go to
`.artifacts/test-results/`; open the report with
`pnpm exec playwright show-report .artifacts/playwright-report`.
Coverage reports live in `.artifacts/coverage/`. All generated test artifacts
are ignored by Git; they are not test source files. CI uploads these same
directories as run artifacts, not repository commits.

### Exact simulation boundary

In `gestures.spec.ts`, Chromium provides its built-in fake video device.
The browser creates a real `MediaStream`, plays video, and transfers real
`ImageBitmap` objects. A Playwright route replaces only the MediaPipe Worker
script with `tests/e2e/fixtures/hand-tracking.worker.js`. This Worker follows
the INIT/FRAME/RESULT/DISPOSE protocol and receives synthetic poses through a
test-only `BroadcastChannel`. Poses come from existing fixtures; expected
positions and pixel assertions are defined in each scenario.

The classifier, pinch hysteresis, pointer filter, gesture state machine,
tutorial, history, Canvas, and PNG encoder are real. The permission-denial test
mocks only the first `getUserMedia` failure, then delegates to the native API.
No E2E hooks or personal videos ship with the app. Tests do not directly mutate
React state.

The separate `security.spec.ts` loads and executes the actual local Worker,
model, and WASM under the production document CSP using fake video. It also checks deployed assets
and a blocked external connection. Inference is real, but the input is still
not a real hand.

**Not validated by this setup:** real-hand recognition, lighting/occlusion,
hardware latency, actual permissions in every browser, or Safari/Firefox
compatibility. Production Worker invariants are covered in Vitest, and
`pnpm verify:vision-assets` checks assets. Physical validation remains
essential before the public demo.

### Accessibility scope and manual checks

Scans use the development dependency `@axe-core/playwright`, with WCAG 2.0
A/AA, 2.1 AA, and 2.2 AA tags. No elements or rules within those tags are
excluded. JSON results, including `incomplete` checks requiring manual review,
are attached to the Playwright report. Zero automated violations is not
certification.

Before release, also check with keyboard and screen reader: pen/eraser slider
names and values, arrow navigation within groups, visible focus, understandable
camera announcements, popovers at native 200% browser zoom, and reduced motion.
The app does not yet provide full mouse/keyboard drawing; do not describe
drawing as entirely accessible without hand tracking.

Automated checks do not replace manual pinching, fluidity, gesture erasing, and
real-drawing export checks. They do not cover Safari/Firefox or every screen
size. DOM tests and mocked Canvas calls are not visual validation.

## When to add a test

Ask: **what concrete bug would this catch that existing tests would miss?**
Test behavior rather than copying the implementation.

Keep distinct boundary cases and known regressions, even when parameterized.
Do not combine scenarios merely to reduce the count. Mock external boundaries,
not the logic under test. Browser checks should establish behavior that
Node/jsdom cannot prove, without repeating every unit-test parameter
combination. CSS assertions need an explicit visual contract at the right level.

## CI and review

The existing `unit-tests` job keeps its name to preserve required GitHub checks.
It runs all three Vitest projects **once** with global coverage; reports identify
each project. The `e2e-chromium` job reuses the `build` artifact through
`E2E_USE_BUILD=1`, avoiding a second CI build. This requires a verified `dist`
directory; do not use it locally with a stale build. Automatic retries do not
hide unstable tests.

Before review, run `pnpm validate` and `pnpm test:coverage`, and check that no
test files are omitted or collected twice. Merging and publishing require
maintainer approval.

References: [Vitest projects](https://v4.vitest.dev/guide/projects),
[Testing Library principles](https://testing-library.com/docs/guiding-principles/),
[avoiding test duplication](https://martinfowler.com/articles/practical-test-pyramid.html#AvoidTestDuplication),
[Playwright accessibility](https://playwright.dev/docs/accessibility-testing).

## Limited hardware and installed browsers

Browser journeys use one worker by default, locally and in CI, so inference and
accessibility scans do not compete. Tests and timeouts are unchanged, with no
retries. This also follows [Playwright's CI recommendation](https://playwright.dev/docs/ci#workers).
On a sufficiently powerful machine, `pnpm test:e2e --workers=2` is available;
verify stability before increasing concurrency.

To check an installed browser in PowerShell:

```powershell
$env:E2E_BROWSER_CHANNEL = 'msedge' # or 'chrome'
pnpm test:e2e security.spec.ts --workers=1
Remove-Item Env:E2E_BROWSER_CHANNEL
```

The browser uses an isolated test profile and fake video, not the user's
profile or webcam. Without this variable, CI uses Playwright's Chromium.
These checks do not establish real-gesture fluidity on the user's hardware.
