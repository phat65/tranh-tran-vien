import {
  buildProductImageUploadTarget,
  getNextProductImageSequence,
  isSupportedProductImageFile,
  slugify,
} from "../helpers"

describe("product image upload helpers", () => {
  it("continues from the highest image number instead of image count", () => {
    const sequence = getNextProductImageSequence({
      pathBaseName: "Naruto",
      images: [
        { url: "https://cdn.example.com/products/naruto/naruto-1.webp" },
        { url: "https://cdn.example.com/products/naruto/naruto-3.webp" },
        { url: "https://cdn.example.com/products/naruto/naruto-4.webp" },
      ],
    })

    expect(sequence).toBe(5)
  })

  it("uses stored sequence when deleted images are no longer in product images", () => {
    const sequence = getNextProductImageSequence({
      pathBaseName: "Naruto",
      storedSequence: 6,
      images: [
        { url: "https://cdn.example.com/products/naruto/naruto-1.webp" },
        { url: "https://cdn.example.com/products/naruto/naruto-3.webp" },
      ],
    })

    expect(sequence).toBe(7)
  })

  it("builds stable product image object keys", () => {
    expect(
      buildProductImageUploadTarget({
        displayBaseName: "Naruto",
        pathBaseName: "Naruto",
        sequence: 4,
        originalFilename: "source.WEBP",
      })
    ).toEqual({
      displayName: "Naruto 4",
      filename: "products/naruto/naruto-4.webp",
    })
  })

  it("validates supported image files", () => {
    expect(
      isSupportedProductImageFile({
        filename: "naruto.jpeg",
        mimeType: "image/jpeg",
      })
    ).toBe(true)
    expect(
      isSupportedProductImageFile({
        filename: "naruto.gif",
        mimeType: "image/gif",
      })
    ).toBe(false)
  })

  it("normalizes Vietnamese and punctuation in slugs", () => {
    expect(slugify("Tranh Lục Giác")).toBe("tranh-luc-giac")
  })
})
