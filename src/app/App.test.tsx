import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { App } from "@/app/App"

describe("App", () => {
  it("annonce DrawMotion comme le titre principal", () => {
    render(<App />)

    expect(
      screen.getByRole("heading", { level: 1, name: "DrawMotion" }),
    ).toBeInTheDocument()
  })
})
