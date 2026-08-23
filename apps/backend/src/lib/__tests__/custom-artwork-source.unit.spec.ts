import { resolveCustomArtworkSourceUrl } from "../custom-artwork-source"

const LOCAL_ENV = {
  MEDUSA_BACKEND_URL: "http://localhost:9000",
} as NodeJS.ProcessEnv

describe("custom artwork source URL", () => {
  it("accepts local files from the configured Medusa static directory", () => {
    expect(
      resolveCustomArtworkSourceUrl(
        "http://localhost:9000/static/custom-wall-uploads/family.png",
        LOCAL_ENV,
      ),
    ).toBe("http://localhost:9000/static/custom-wall-uploads/family.png")

    expect(
      resolveCustomArtworkSourceUrl(
        "/static/custom-wall-uploads/family.png",
        LOCAL_ENV,
      ),
    ).toBe("http://localhost:9000/static/custom-wall-uploads/family.png")
  })

  it("accepts only files under the configured cloud storage base URL", () => {
    const cloudEnv = {
      S3_PUBLIC_BASE_URL: "https://cdn.example.com/tranh-tran-vien",
    } as NodeJS.ProcessEnv

    expect(
      resolveCustomArtworkSourceUrl(
        "https://cdn.example.com/tranh-tran-vien/custom-wall/image.webp",
        cloudEnv,
      ),
    ).toBe("https://cdn.example.com/tranh-tran-vien/custom-wall/image.webp")
    expect(
      resolveCustomArtworkSourceUrl(
        "https://cdn.example.com/not-allowed/image.webp",
        cloudEnv,
      ),
    ).toBeNull()
  })

  it("rejects untrusted origins and lookalike paths", () => {
    expect(
      resolveCustomArtworkSourceUrl(
        "https://untrusted.example/image.png",
        LOCAL_ENV,
      ),
    ).toBeNull()
    expect(
      resolveCustomArtworkSourceUrl(
        "http://localhost:9000/static-evil/image.png",
        LOCAL_ENV,
      ),
    ).toBeNull()
  })
})
