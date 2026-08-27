# Batch 10 — Local validation on August 27, 2026

Historical report, not validation of the current HEAD.

Environment: Windows, Node 24.18.0, pnpm 11.19.0. Work was retained as atomic
commits on `feat/immersive-workspace-onboarding`, without pushing, merging,
deploying, or changing repository visibility.

## Results

| Check                                    | Result                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Prettier, ESLint, TypeScript, Vite build | Passed                                                                                   |
| Vitest with coverage                     | 246 tests in 38 files passed                                                             |
| Coverage                                 | Lines 84.47%, statements 83.50%, functions 83.90%, branches 75.89%; thresholds unchanged |
| Serial Playwright Chromium               | 15 journeys passed, without retries                                                      |
| Edge 151.0.4129.107                      | Five tests passed: real inference under CSP and settings in four layouts                 |
| Chrome 151.0.7922.174                    | Real inference under CSP passed                                                          |
| MediaPipe assets                         | Seven hashes verified                                                                    |
| Application + Worker JavaScript          | 655,597 bytes raw / 204,348 bytes gzip                                                   |
| CSS                                      | 72,640 bytes raw                                                                         |
| Development diagnostics                  | Absent from production bundle, checked automatically                                     |
| pnpm audit, production and development   | No known vulnerabilities reported at the time                                            |
| Headers and CSP                          | Tested on Vite preview with the `vercel.json` policy, including the verification CLI     |

The Worker in `security.spec.ts` is not mocked: the real model/WASM processes
**fake** video without using the user's webcam. Other gesture journeys inject
deterministic landmarks.

Visual checks at 640×400 found an overflowing color panel and page scrolling
caused by focus. The panel now scrolls within its available height, and the test
checks that the page remains stationary. An axe scan during the opening
animation was unstable; scans now wait for animations to finish, without
removing contrast rules. The Impeccable / Make interfaces feel better UX review
stayed focused on adaptation and feedback, with no redesign or added dependency.

## Not validated / required before publication

- [ ] Accuracy and gesture-to-ink latency with a physical webcam.
- [ ] A distant pinched hand return without a connecting line in Chrome and Edge.
- [ ] Native 200% browser zoom, physical tablet, touch, and virtual keyboard.
- [ ] System permissions and low lighting on target machines.
- [ ] Headers on an actually deployed HTTPS preview.
- [ ] Remote GitHub workflow execution and Code Security availability.
- [ ] Safari/Firefox if supporting them becomes a goal.

These results are neither WCAG certification nor release approval.
Batch 11 had not started at the time of this report.
