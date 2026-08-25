import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

import {
  CanvasDrawingController,
  type DrawingStyle,
} from "@/core/drawing/canvas-drawing-controller"
import type { StrokeAssistanceFeedback } from "@/core/drawing/canvas-drawing-controller"
import type { StrokeAssistanceMode } from "@/core/drawing/stroke-assistance"
import { TwoLayerCanvasRenderer } from "@/core/drawing/two-layer-canvas-renderer"

import type { DrawingIntention } from "@/core/gestures/drawing-intentions"

export type DrawingCanvasHandle = {
  handleIntentions(intentions: readonly DrawingIntention[]): void
  revertAssistance(strokeId: string): boolean
}

type DrawingCanvasProps = {
  assistanceMode: StrokeAssistanceMode
  drawingStyle: DrawingStyle
  onAssistance: (feedback: StrokeAssistanceFeedback) => void
}

export const DrawingCanvas = forwardRef<
  DrawingCanvasHandle,
  DrawingCanvasProps
>(function DrawingCanvas(
  { assistanceMode, drawingStyle, onAssistance }: DrawingCanvasProps,
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const persistentRef = useRef<HTMLCanvasElement>(null)
  const interactionRef = useRef<HTMLCanvasElement>(null)
  const controllerRef = useRef<CanvasDrawingController | null>(null)
  const onAssistanceRef = useRef(onAssistance)
  const assistanceModeRef = useRef(assistanceMode)
  const drawingStyleRef = useRef(drawingStyle)

  useEffect(() => {
    onAssistanceRef.current = onAssistance
  }, [onAssistance])

  useEffect(() => {
    assistanceModeRef.current = assistanceMode
    controllerRef.current?.setAssistanceMode(assistanceMode)
  }, [assistanceMode])

  useEffect(() => {
    drawingStyleRef.current = drawingStyle
    controllerRef.current?.setStyle(drawingStyle)
  }, [drawingStyle])

  useImperativeHandle(
    ref,
    () => ({
      handleIntentions(intentions) {
        for (const intention of intentions)
          controllerRef.current?.handle(intention)
      },
      revertAssistance(strokeId) {
        return controllerRef.current?.revertAssistance(strokeId) ?? false
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
    controller.setAssistanceMode(assistanceModeRef.current)
    controller.setStyle(drawingStyleRef.current)
    controller.setAssistanceListener((feedback) =>
      onAssistanceRef.current(feedback),
    )
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
})
