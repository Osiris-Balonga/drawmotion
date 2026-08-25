type CanvasFactory = () => HTMLCanvasElement

export function canvasToPngBlob(
  source: HTMLCanvasElement,
  createCanvas: CanvasFactory = () => document.createElement("canvas"),
) {
  return new Promise<Blob>((resolve, reject) => {
    const output = createCanvas()
    output.width = source.width
    output.height = source.height
    const context = output.getContext("2d")
    if (!context) {
      reject(new Error("PNG export requires Canvas 2D support"))
      return
    }

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, output.width, output.height)
    context.drawImage(source, 0, 0)
    output.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("The browser could not encode the PNG"))
    }, "image/png")
  })
}
