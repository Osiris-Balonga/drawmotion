// GitHub Pages cannot configure response headers. Meta CSP applies to the
// document only: it does not sandbox the Worker's own requests or framing.
export const documentCsp =
  "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'"
