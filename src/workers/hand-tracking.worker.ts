import { MediaPipeHandTracker } from "@/infrastructure/mediapipe/mediapipe-hand-tracker"
import {
  createVisionWorkerRuntime,
  type VisionWorkerScope,
} from "@/infrastructure/mediapipe/vision-worker-runtime"
import type { VisionWorkerRequest } from "@/infrastructure/mediapipe/worker-protocol"

type DedicatedVisionWorker = VisionWorkerScope & {
  onmessage: ((event: MessageEvent<VisionWorkerRequest>) => void) | null
}

const scope = self as unknown as DedicatedVisionWorker
const runtime = createVisionWorkerRuntime(scope, new MediaPipeHandTracker())

scope.onmessage = (event) => {
  void runtime.handleMessage(event.data)
}
