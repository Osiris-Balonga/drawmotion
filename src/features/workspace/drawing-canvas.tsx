import { useEffect, useRef } from "react"

import { CanvasDrawingController } from "@/core/drawing/canvas-drawing-controller"
import { TwoLayerCanvasRenderer } from "@/core/drawing/two-layer-canvas-renderer"

export function DrawingCanvas() {
  const rootRef = useRef<HTMLDivElement>(null)
  const persistentRef = useRef<HTMLCanvasElement>(null)
  const interactionRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const persistent = persistentRef.current
    const interaction = interactionRef.current
    if (!root || !persistent || !interaction || !globalThis.ResizeObserver) {
      return
    }

    const renderer = new TwoLayerCanvasRenderer(persistent, interaction)
    const controller = new CanvasDrawingController(renderer)
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const bounds = entry.contentRect
      controller.setBounds({
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      })
    })
    observer.observe(root)

    return () => {
      observer.disconnect()
      renderer.dispose()
    }
  }, [])

  return (
    <div ref={rootRef} className="drawing-canvas" aria-hidden="true">
      <canvas ref={persistentRef} className="drawing-canvas__layer" />
      <canvas ref={interactionRef} className="drawing-canvas__layer" />
    </div>
  )
}
