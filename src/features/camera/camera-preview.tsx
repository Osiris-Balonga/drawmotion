import { Hand, Video } from "lucide-react"

import { Badge } from "@/components/ui/badge"

export function CameraPreview() {
  return (
    <section aria-label="Aperçu caméra simulé" className="camera-preview">
      <div className="camera-preview__viewport">
        <Hand aria-hidden="true" className="text-muted-foreground size-16" />
        <span className="camera-preview__landmark camera-preview__landmark--one" />
        <span className="camera-preview__landmark camera-preview__landmark--two" />
        <span className="camera-preview__landmark camera-preview__landmark--three" />
      </div>
      <Badge className="camera-preview__badge" variant="secondary">
        <Video aria-hidden="true" data-icon="inline-start" />
        Aperçu simulé
      </Badge>
    </section>
  )
}
