export const OFFLINE_PROTOCOL = 1
export const OFFLINE_STATUS_REQUEST = "GET_OFFLINE_STATUS"

export type OfflineReport = {
  protocol: typeof OFFLINE_PROTOCOL
  requestId: string
  buildId: string
  scope: string
  complete: boolean
  missing: number
}

export function isOfflineReport(
  value: unknown,
  requestId: string,
  scope: string,
): value is OfflineReport {
  if (!value || typeof value !== "object") return false
  const report = value as Partial<OfflineReport>
  return (
    report.protocol === OFFLINE_PROTOCOL &&
    report.requestId === requestId &&
    report.scope === scope &&
    typeof report.buildId === "string" &&
    report.buildId.length > 0 &&
    typeof report.complete === "boolean" &&
    typeof report.missing === "number" &&
    Number.isInteger(report.missing) &&
    report.missing >= 0 &&
    report.complete === (report.missing === 0)
  )
}
