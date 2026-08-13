const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"])
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
])

export type ExistingProductImage = {
  url?: string | null
}

export function isSupportedProductImageFile(input: {
  filename: string
  mimeType: string
}) {
  return (
    SUPPORTED_IMAGE_EXTENSIONS.has(getFileExtension(input.filename)) &&
    SUPPORTED_IMAGE_MIME_TYPES.has(input.mimeType.toLowerCase())
  )
}

export function buildProductImageUploadTarget(input: {
  displayBaseName: string
  pathBaseName: string
  sequence: number
  originalFilename: string
}) {
  const slug = slugify(input.pathBaseName || input.displayBaseName || "product")
  const extension = getFileExtension(input.originalFilename) || ".jpg"

  return {
    displayName: `${input.displayBaseName} ${input.sequence}`,
    filename: `products/${slug}/${slug}-${input.sequence}${extension}`,
  }
}

export function getNextProductImageSequence(input: {
  images: ExistingProductImage[]
  pathBaseName: string
  storedSequence?: number | null
}) {
  const slug = slugify(input.pathBaseName || "product")
  const highestImageNumber = input.images.reduce((highest, image) => {
    const number = extractSequenceFromImageUrl(image.url, slug)

    return number ? Math.max(highest, number) : highest
  }, 0)

  return Math.max(highestImageNumber, input.storedSequence ?? 0) + 1
}

export function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "product"
}

export function getFileExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.[a-z0-9]+$/)

  return match?.[0] ?? ""
}

function extractSequenceFromImageUrl(url: string | null | undefined, slug: string) {
  if (!url) {
    return 0
  }

  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = url.match(new RegExp(`${escapedSlug}-(\\d+)(?=\\.[a-z0-9]+(?:\\?|#|$))`, "i"))
  const number = match ? Number(match[1]) : 0

  return Number.isFinite(number) ? number : 0
}
