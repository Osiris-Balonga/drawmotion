import { expect, it } from "vitest"
import { VisionDiagnostics } from "@/infrastructure/mediapipe/vision-diagnostics"

it("reports bounded rolling latency percentiles and completion rate at most every five seconds", () => {
  const diagnostics = new VisionDiagnostics()
  expect(diagnostics.record(0, 9000)).toBeNull()
  for (let index = 1; index < 125; index += 1)
    diagnostics.record(index * 40, 20)
  expect(diagnostics.record(5000, 100)).toEqual({
    samples: 120,
    detectionFps: 25,
    medianLatencyMs: 20,
    p95LatencyMs: 20,
  })
  expect(diagnostics.record(5040, 30)).toBeNull()
})
