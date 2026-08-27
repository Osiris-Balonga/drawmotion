# Compatibility, privacy, and troubleshooting

## Scope

DrawMotion is a client-side gesture drawing application for desktop and tablet.
Gesture drawing and erasing require a camera and a detected hand. Settings,
commands, history, export, zoom, and panning also work with mouse and keyboard.
There is no complete camera-free drawing mode yet.

Recent Chrome and Edge versions are the demo targets. Camera access requires
HTTPS or `localhost`/`127.0.0.1` during development; plain HTTP on a LAN is
not enough. The browser needs Worker, WebAssembly, createImageBitmap, Canvas,
and getUserMedia support. Tracking tries the GPU and falls back to the CPU if
GPU initialization fails; this does not guarantee adequate speed on every device.

| Environment                        | Available validation                                                     | Limitations                                                       |
| ---------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Automated Chromium on Windows      | Full journeys, real model/WASM on fake video, export, CSP, keyboard, axe | Not a real hand or an accuracy measurement                        |
| Installed Chrome / Edge            | Smoke tests with `E2E_BROWSER_CHANNEL`                                   | Physical webcam QA required before distribution                   |
| Tablet layouts: 782×600 / 768×1024 | Layout and settings in an automated browser                              | Not physical iPad/Android validation                              |
| 200% zoom                          | CSS viewports of 720×450 / 640×400, equivalent to 1440×900 / 1280×800    | Native zoom, virtual keyboard, and touch still need manual checks |
| Safari / Firefox                   | Not tested                                                               | Not guaranteed for the demo; feedback is shown if tracking fails  |
| Phone / very narrow window         | Explicit compatibility message; no automatic camera request              | Mobile drawing is not supported                                   |

Desktop windows remain usable from 640 CSS pixels with a fine pointer. Small
touch surfaces below 768 pixels show advice to use a tablet in landscape or a
computer. This does not require browser-brand sniffing.

Dated results: [batch 10 local validation](qa/lot10-local.md).

## Privacy

- No account, analysis server, analytics, or telemetry SDK in the app.
- Frames and landmarks stay in device memory. DrawMotion does not record or
  upload video and does not request microphone access.
- The model, WASM, fonts, and illustrations are served from the application's
  origin. The browser/host receives normal asset requests, not video frames.
- Tutorial state is stored in `localStorage`; clearing site data resets it.
  Drawings do not survive a reload: export a PNG before leaving.
- Pausing or moving the tab into the background stops the camera.
- Development diagnostics contain only timings and counters and are excluded
  from the production build.

These findings apply to the verified package and build, not every MediaPipe
version. The [upstream notice](https://github.com/google-ai-edge/mediapipe#privacy-notice)
mentions metrics for some APIs, so upgrades require another network check under
CSP. Current tests observe no third-party connections during loading or local
inference.

## Performance

Only one image is transferred to the Worker at a time. A second may wait on the
main thread; a newer image replaces it and releases its ImageBitmap. This keeps
the synchronous Worker from processing a long queue of outdated positions.
A capture may be in progress while an image is waiting. The Worker also retains
its internal queue guard.

In the `pnpm dev` console, enable **Verbose/Debug** messages to see
`[DrawMotion vision]`, at most once every five seconds:

- `detectionFps`: result frequency over a window of up to 120 results.
- `medianLatencyMs` / `p95LatencyMs`: time from bitmap submission to result
  reception, including waiting, but excluding capture and screen rendering.
- `droppedFrames`: images replaced before transfer. This can increase normally
  when the camera produces frames faster than inference can process them.

These are not end-to-end gesture-to-ink measurements. That requires timestamped
video and a physical device.

`pnpm verify:bundle` checks the local application and Worker build against total
budgets of 800 KiB raw JS, 250 KiB gzip JS, and 100 KiB raw CSS. The prototype is
approximately 640 KiB raw JS / 200 KiB gzip and 71 KiB CSS. Model/WASM files are
excluded, checked separately by `pnpm verify:vision-assets`, and loaded when
tracking starts.

## Production headers

`vercel.json` blocks third-party resources, inline scripts, and dynamic
JavaScript evaluation. `wasm-unsafe-eval` allows WASM compilation without
allowing `unsafe-eval`. Inline styles remain allowed for dynamic Base UI/React
positions and colors. Images using `data:`/`blob:` and local media are allowed;
Workers are same-origin. Embedding in an iframe and external forms are blocked.
Microphone, geolocation, USB, and payment access are disabled by policy.

`pnpm preview` applies the same headers for local tests, including the Worker
file. `pnpm dev` retains the development configuration needed for HMR.
`security.spec.ts` runs real MediaPipe inference and verifies that CSP blocks
an external connection; other gesture tests use deterministic landmarks.

After an authorized deployment, check the **actual HTTPS URL**:

```sh
pnpm verify:security-headers https://YOUR-PREVIEW-URL
```

A protected preview may return a 401 or redirect. That is an incomplete check,
not a reason to disable protection. No deployment was performed for batch 10;
local verification does not prove CDN headers.

## Troubleshooting

| Symptom                             | Action                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Access denied                       | Allow camera access in site settings, then retry                                                   |
| Camera busy                         | Close the other application using the webcam                                                       |
| Camera missing                      | Check the connection, system permissions, and HTTPS/localhost address                              |
| Tracking unavailable                | Try up-to-date Chrome/Edge; export and reload; check local asset loading                           |
| Hand not detected                   | Keep the whole hand in the real camera field and improve lighting; the circle is a cropped preview |
| Jerky strokes                       | Close heavy workloads, check development FPS/p95, and try the other target browser                 |
| Settings panel too tall when zoomed | Scroll the settings panel, not the page; Escape closes it                                          |
| Camera paused after switching tabs  | Click its preview to resume                                                                        |

## Before the public demo

Test on physical Chrome and Edge setups: permissions, denial/recovery, low
lighting, fist erasing, tracking loss followed by a distant pinched return
without a connecting stroke, native 200% zoom, tablet touch, export, and
background pausing. Verify the HTTPS preview and headers too. These remain
release prerequisites, not assumed successes.

References: [MediaPipe Web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js),
[CSP and WASM](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src),
[Workers and CSP](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#content_security_policy),
[Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json).
