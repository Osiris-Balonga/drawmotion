# MediaPipe vision assets

DrawMotion serves these files from its own origin so starting hand tracking does
not depend on a CDN or a third-party request. Every file is committed unchanged
and checked by `pnpm verify:vision-assets` before the production build.

## Provenance

- Runtime: `@mediapipe/tasks-vision` version `1.0.1`, downloaded from the npm
  registry. The package declares the Apache-2.0 license and publishes the
  runtime under `wasm/`.
- Model: Hand Landmarker full, float16, version 1, downloaded from the official
  MediaPipe model bucket:
  `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`.
- Model documentation:
  `https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker`.
- Retrieval date: 2026-08-25.

The MediaPipe project and JavaScript package are distributed under Apache-2.0.
Google's implementation guide explicitly directs web applications to download
the compatible model into their project. The model bundle is redistributed
unchanged from the official versioned URL above. The guide links the
[Hand Tracking Lite/Full model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf),
whose page 2 specifies Apache License, Version 2.0 (checked 2026-08-27).
The full licence is retained in [../licenses/mediapipe-Apache-2.0.txt](../licenses/mediapipe-Apache-2.0.txt).
See [distribution notices](../licenses/README.md) for other bundled assets.

## SHA-256

| File                                    | SHA-256                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `hand_landmarker.task`                  | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |
| `wasm/vision_wasm_internal.js`          | `e170ee67dd4e16c1a6fcd8840a206687e5a59b22c20e4a902bc445b095454d73` |
| `wasm/vision_wasm_internal.wasm`        | `8da277a733926eacd0474b8704b36742d6ec3231c57a860c5b889dff8f1df886` |
| `wasm/vision_wasm_module_internal.js`   | `da8934057f147b622e82cfb4c0dbd85461c598e268588b5a8ba9ca963a8ff82d` |
| `wasm/vision_wasm_module_internal.wasm` | `2dabd8e23c60984628beb7bb338764c81a08e6837145273f59578684b5d53c1b` |
| `wasm/vision_wasm_nosimd_internal.js`   | `e81d715a3d42cc3373602eb2f7aff795d164934db680e32496b65dab537f9658` |
| `wasm/vision_wasm_nosimd_internal.wasm` | `a28483cd42e74e855bf5ebdb6b40d9b66a5b49e35e95020bc97669e6822a3192` |
