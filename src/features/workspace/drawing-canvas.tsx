import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

import { CanvasDrawingController } from "@/core/drawing/canvas-drawing-controller"
import { TwoLayerCanvasRenderer } from "@/core/drawing/two-layer-canvas-renderer"

import type { DrawingIntention } from "@/core/gestures/drawing-intentions"

export type DrawingCanvasHandle = {
  handleIntentions(intentions: readonly DrawingIntention[]): void
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle>(
  function DrawingCanvas(_props, ref) {
    const rootRef = useRef<HTMLDivElement>(null)
    const persistentRef = useRef<HTMLCanvasElement>(null)
    const interactionRef = useRef<HTMLCanvasElement>(null)
    const controllerRef = useRef<CanvasDrawingController | null>(null)

    useImperativeHandle(
      ref,
      () => ({
        handleIntentions(intentions) {
          for (const intention of intentions)
            controllerRef.current?.handle(intention)
        },
      }),
      [],
    )

    useEffect(() => {
      const root = rootRef.current
      const persistent = persistentRef.current
      const interaction = interactionRef.current
      if (!root || !persistent || !interaction || !globalThis.ResizeObserver) {
        return
      }

      const renderer = new TwoLayerCanvasRenderer(persistent, interaction)
      const controller = new CanvasDrawingController(renderer)
      controllerRef.current = controller
      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return
        const bounds = root.getBoundingClientRect()
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
        controllerRef.current = null
        renderer.dispose()
      }
    }, [])

    return (
      <div ref={rootRef} className="drawing-canvas" aria-hidden="true">
        <canvas ref={persistentRef} className="drawing-canvas__layer" />
        <canvas ref={interactionRef} className="drawing-canvas__layer" />
      </div>
    )
  },
)
