import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { toast } from "sonner"
import { t } from "@/i18n"
import type { DrawingDocument } from "@/core/drawing/drawing-model"
import { saveDrawingDraft } from "@/infrastructure/storage/drawing-draft"

import {
  CanvasDrawingController,
  type DrawingHistoryAvailability,
  type DrawingStyle,
} from "@/core/drawing/canvas-drawing-controller"
import type { CanvasViewport } from "@/core/drawing/canvas-viewport"
import type { StrokeAssistanceFeedback } from "@/core/drawing/canvas-drawing-controller"
import type { StrokeAssistanceMode } from "@/core/drawing/stroke-assistance"
import { TwoLayerCanvasRenderer } from "@/core/drawing/two-layer-canvas-renderer"

import type { DrawingIntention } from "@/core/gestures/drawing-intentions"

export type DrawingCanvasHandle = {
  handleIntentions(intentions: readonly DrawingIntention[]): void
  setStyle(style: DrawingStyle): void
  revertAssistance(strokeId: string): boolean
  undo(): void
  redo(): void
  clear(): void
  exportPng(): Promise<Blob>
}

type DrawingCanvasProps = {
  initialDocument: DrawingDocument
  assistanceMode: StrokeAssistanceMode
  drawingStyle: DrawingStyle
  renderPointer?: boolean
  viewport: CanvasViewport
  onAssistance: (feedback: StrokeAssistanceFeedback) => void
  onHistoryChange: (availability: DrawingHistoryAvailability) => void
}

export const DrawingCanvas = forwardRef<
  DrawingCanvasHandle,
  DrawingCanvasProps
>(function DrawingCanvas(
  {
    initialDocument,
    assistanceMode,
    drawingStyle,
    renderPointer = true,
    viewport,
    onAssistance,
    onHistoryChange,
  }: DrawingCanvasProps,
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const persistentRef = useRef<HTMLCanvasElement>(null)
  const interactionRef = useRef<HTMLCanvasElement>(null)
  const controllerRef = useRef<CanvasDrawingController | null>(null)
  const onAssistanceRef = useRef(onAssistance)
  const onHistoryChangeRef = useRef(onHistoryChange)
  const assistanceModeRef = useRef(assistanceMode)
  const drawingStyleRef = useRef(drawingStyle)
  const viewportRef = useRef(viewport)
  const initialDocumentRef = useRef(initialDocument)
  const saveRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    onAssistanceRef.current = onAssistance
  }, [onAssistance])

  useEffect(() => {
    onHistoryChangeRef.current = onHistoryChange
  }, [onHistoryChange])

  useEffect(() => {
    assistanceModeRef.current = assistanceMode
    controllerRef.current?.setAssistanceMode(assistanceMode)
  }, [assistanceMode])

  useEffect(() => {
    drawingStyleRef.current = drawingStyle
    controllerRef.current?.setStyle(drawingStyle)
  }, [drawingStyle])

  useEffect(() => {
    viewportRef.current = viewport
    controllerRef.current?.setViewport(viewport)
    // Avoid serializing a whole drawing for every wheel or pan event.
    const timer = window.setTimeout(() => saveRef.current?.(), 250)
    return () => window.clearTimeout(timer)
  }, [viewport])

  useImperativeHandle(
    ref,
    () => ({
      handleIntentions(intentions) {
        for (const intention of intentions)
          controllerRef.current?.handle(intention)
      },
      setStyle(style) {
        controllerRef.current?.setStyle(style)
      },
      revertAssistance(strokeId) {
        return controllerRef.current?.revertAssistance(strokeId) ?? false
      },
      undo() {
        controllerRef.current?.undo()
      },
      redo() {
        controllerRef.current?.redo()
      },
      clear() {
        controllerRef.current?.clear()
      },
      exportPng() {
        return (
          controllerRef.current?.exportPng() ??
          Promise.reject(new Error("The canvas is not ready yet"))
        )
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
    renderer.setPointerVisible(renderPointer)
    const controller = new CanvasDrawingController(
      renderer,
      50,
      initialDocumentRef.current,
    )
    controller.setViewport(viewportRef.current)
    let savedDocument = controller.document
    let savedViewport = viewportRef.current
    const save = () => {
      const viewport = viewportRef.current
      if (
        controller.document === savedDocument &&
        viewport.zoom === savedViewport.zoom &&
        viewport.offsetX === savedViewport.offsetX &&
        viewport.offsetY === savedViewport.offsetY
      )
        return
      if (saveDrawingDraft({ document: controller.document, viewport })) {
        savedDocument = controller.document
        savedViewport = viewport
        toast.dismiss("drawing-save")
      } else {
        toast.error(t("draft.saveFailed"), {
          id: "drawing-save",
          duration: Infinity,
        })
      }
    }
    saveRef.current = save
    controller.setAssistanceMode(assistanceModeRef.current)
    controller.setStyle(drawingStyleRef.current)
    controller.setAssistanceListener((feedback) =>
      onAssistanceRef.current(feedback),
    )
    controller.setHistoryListener((availability) => {
      onHistoryChangeRef.current(availability)
      save()
    })
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

    const flush = () => {
      controller.handle({
        type: "PAUSE",
        version: 1,
        timestampMs: performance.now(),
      })
      save()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush()
    }
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      flush()
      initialDocumentRef.current = controller.document
      saveRef.current = null
      observer.disconnect()
      controllerRef.current = null
      renderer.dispose()
    }
  }, [renderPointer])

  return (
    <div ref={rootRef} className="drawing-canvas" aria-hidden="true">
      <canvas ref={persistentRef} className="drawing-canvas__layer" />
      <canvas ref={interactionRef} className="drawing-canvas__layer" />
    </div>
  )
})
