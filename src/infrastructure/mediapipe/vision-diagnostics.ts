/** Local, bounded timing samples only: never stores images or landmarks. */
export class VisionDiagnostics {
  private samples: { completedAt: number; latencyMs: number }[] = []
  private lastReportAt = 0

  record(completedAt: number, latencyMs: number) {
    this.samples.push({ completedAt, latencyMs })
    if (this.samples.length > 120) this.samples.shift()
    if (completedAt - this.lastReportAt < 5000 || this.samples.length < 2)
      return null
    this.lastReportAt = completedAt
    const sorted = this.samples
      .map((sample) => sample.latencyMs)
      .sort((a, b) => a - b)
    const elapsed = completedAt - (this.samples[0]?.completedAt ?? completedAt)
    return {
      samples: sorted.length,
      detectionFps: elapsed > 0 ? ((sorted.length - 1) * 1000) / elapsed : 0,
      medianLatencyMs: sorted[Math.ceil(sorted.length * 0.5) - 1],
      p95LatencyMs: sorted[Math.ceil(sorted.length * 0.95) - 1],
    }
  }
}
