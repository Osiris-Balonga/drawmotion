// Replaces only MediaPipe inference in browser tests. Real transferred video
// frames, the application's classifier, filters and drawing engine still run.
const channel = new BroadcastChannel("drawmotion-e2e-landmarks")
let frames = []
let currentHands = []
let commandId = null
let consumedId = null

channel.onmessage = ({ data }) => {
  frames = [...data.frames]
  commandId = data.id
}

self.onmessage = ({ data }) => {
  if (data.type === "INIT") {
    self.postMessage({ version: 1, type: "INIT", status: "ready" })
  } else if (data.type === "FRAME") {
    // Acknowledge on the NEXT frame: the app has consumed the last result.
    if (consumedId !== null) {
      channel.postMessage({ completed: consumedId })
      consumedId = null
    }
    if (frames.length) {
      currentHands = frames.shift()
      if (!frames.length) consumedId = commandId
    }
    data.frame.close()
    self.postMessage({
      version: 1,
      type: "RESULT",
      result: {
        frameId: data.frameId,
        timestampMs: data.timestampMs,
        hands: currentHands,
      },
    })
  } else if (data.type === "DISPOSE") {
    channel.close()
    self.postMessage({ version: 1, type: "DISPOSE", status: "disposed" })
  }
}
