function pad(value: number) {
  return String(value).padStart(2, "0")
}

export function createPngFilename(date = new Date()) {
  const day = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-")
  const time = [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("")
  return `drawmotion-${day}-${time}.png`
}

export function downloadPng(
  blob: Blob,
  filename: string,
  documentRoot: Document = document,
  urlApi: Pick<typeof URL, "createObjectURL" | "revokeObjectURL"> = URL,
) {
  const objectUrl = urlApi.createObjectURL(blob)
  const anchor = documentRoot.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  anchor.hidden = true
  documentRoot.body.append(anchor)
  anchor.click()
  anchor.remove()
  queueMicrotask(() => urlApi.revokeObjectURL(objectUrl))
}
