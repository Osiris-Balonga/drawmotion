import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"
import {
  initialCanvasViewport,
  panCanvasViewport,
  zoomCanvasViewport,
  type CanvasViewport,
} from "@/core/drawing/canvas-viewport"
import type { DrawingHistoryAvailability } from "@/core/drawing/canvas-drawing-controller"
import type { DrawingTool } from "@/features/toolbar/drawing-tools"

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  )
}

type NavigationCommands = {
  changeTool: (tool: DrawingTool) => void
  historyAvailability: DrawingHistoryAvailability
  undo: () => void
  redo: () => void
  isGesturePaletteOpen: () => boolean
  closeGesturePalette: () => void
  openGesturePaletteFromDock: () => void
}
export function useWorkspaceNavigation(
  stageRef: RefObject<HTMLElement | null>,
  {
    changeTool,
    historyAvailability,
    undo,
    redo,
    isGesturePaletteOpen,
    closeGesturePalette,
    openGesturePaletteFromDock,
  }: NavigationCommands,
) {
  const [viewport, setViewport] = useState<CanvasViewport>(
    initialCanvasViewport,
  )
  const panSessionRef = useRef<{
    pointerId: number
    x: number
    y: number
  } | null>(null)
  const spacePanRef = useRef(false)

  const zoomAtStageCenter = useCallback(
    (factor: number) => {
      const bounds = stageRef.current?.getBoundingClientRect()
      if (!bounds) return
      setViewport((current) =>
        zoomCanvasViewport(current, current.zoom * factor, {
          x: bounds.width / 2,
          y: bounds.height / 2,
        }),
      )
    },
    [setViewport, stageRef],
  )

  const resetViewport = useCallback(() => {
    setViewport(initialCanvasViewport)
  }, [])

  const handleStageWheel = useCallback(
    (event: ReactWheelEvent<HTMLElement>) => {
      if (
        event.target instanceof Element &&
        event.target.closest("button, select, input, [role='dialog']")
      ) {
        return
      }
      event.preventDefault()
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * 0.002)
        setViewport((current) =>
          zoomCanvasViewport(current, current.zoom * factor, {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          }),
        )
      } else {
        setViewport((current) =>
          panCanvasViewport(current, {
            x: -event.deltaX,
            y: -event.deltaY,
          }),
        )
      }
    },
    [setViewport],
  )

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const canPan =
        event.button === 1 || (event.button === 0 && spacePanRef.current)
      if (!canPan) return
      if (
        event.target instanceof Element &&
        event.target.closest("button, select, input, [role='dialog']")
      ) {
        return
      }
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      event.currentTarget.setAttribute("data-panning", "")
      panSessionRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      }
    },
    [],
  )

  const handleStagePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = panSessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      const delta = {
        x: event.clientX - session.x,
        y: event.clientY - session.y,
      }
      session.x = event.clientX
      session.y = event.clientY
      setViewport((current) => panCanvasViewport(current, delta))
    },
    [setViewport],
  )

  const finishStagePan = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = panSessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      panSessionRef.current = null
      event.currentTarget.removeAttribute("data-panning")
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    [],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      const key = event.key.toLowerCase()
      const withCommand = event.ctrlKey || event.metaKey
      if (withCommand && key === "z") {
        const canApply = event.shiftKey
          ? historyAvailability.canRedo
          : historyAvailability.canUndo
        if (!canApply) return
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (withCommand && key === "y" && historyAvailability.canRedo) {
        event.preventDefault()
        redo()
      } else if (!withCommand && !event.altKey && key === "p") {
        event.preventDefault()
        changeTool("pen")
      } else if (!withCommand && !event.altKey && key === "e") {
        event.preventDefault()
        changeTool("eraser")
      } else if (!withCommand && !event.altKey && key === "m") {
        event.preventDefault()
        if (isGesturePaletteOpen()) closeGesturePalette()
        else openGesturePaletteFromDock()
      } else if (
        !withCommand &&
        !event.altKey &&
        (key === "+" || key === "=")
      ) {
        event.preventDefault()
        zoomAtStageCenter(1.2)
      } else if (!withCommand && !event.altKey && key === "-") {
        event.preventDefault()
        zoomAtStageCenter(1 / 1.2)
      } else if (!withCommand && !event.altKey && key === "0") {
        event.preventDefault()
        resetViewport()
      } else if (event.key === "Escape" && isGesturePaletteOpen()) {
        event.preventDefault()
        closeGesturePalette()
      } else if (
        !withCommand &&
        !event.altKey &&
        event.code === "Space" &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        event.preventDefault()
        spacePanRef.current = true
        stageRef.current?.setAttribute("data-pan-ready", "")
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return
      spacePanRef.current = false
      stageRef.current?.removeAttribute("data-pan-ready")
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [
    closeGesturePalette,
    stageRef,
    isGesturePaletteOpen,
    changeTool,
    historyAvailability,
    openGesturePaletteFromDock,
    redo,
    resetViewport,
    undo,
    zoomAtStageCenter,
  ])

  return {
    viewport,
    zoomAtStageCenter,
    resetViewport,
    handleStagePointerDown,
    handleStagePointerMove,
    finishStagePan,
    handleStageWheel,
  }
}
