import { CLIENT_BUILD_REQUEST } from "./pwa-contract"

type PageClient = {
  url: string
  postMessage: (message: unknown, transfer: Transferable[]) => void
}

// clients.claim() affects every in-scope page, not only the requesting tab.
// Never adopt an older document or one that cannot identify itself.
export async function clientsMatchBuild(
  clients: readonly PageClient[],
  scope: string,
  buildId: string,
) {
  const matches = await Promise.all(
    clients
      .filter((client) => client.url.startsWith(scope))
      .map(
        (client) =>
          new Promise<boolean>((resolve) => {
            const channel = new MessageChannel()
            const finish = (matches: boolean) => {
              clearTimeout(timer)
              channel.port1.close()
              channel.port2.close()
              resolve(matches)
            }
            const timer = setTimeout(() => finish(false), 1500)
            channel.port1.onmessage = (event: MessageEvent<unknown>) =>
              finish(event.data === buildId)
            try {
              client.postMessage({ type: CLIENT_BUILD_REQUEST }, [
                channel.port2,
              ])
            } catch {
              finish(false)
            }
          }),
      ),
  )
  return matches.every(Boolean)
}
