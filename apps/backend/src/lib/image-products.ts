export const IMAGE_PRODUCT_ID_PREFIX = "imgprod_"

export type ImageProductSourceImage = {
  id: string
  url: string
  rank?: number | null
  created_at?: string | Date | null
  updated_at?: string | Date | null
  metadata?: Record<string, unknown> | null
}

export type ImageProductSource = Record<string, any> & {
  id: string
  title: string
  handle?: string | null
  created_at?: string | Date | null
  updated_at?: string | Date | null
  images?: ImageProductSourceImage[] | null
  metadata?: Record<string, unknown> | null
}

export type NormalizedImageProductMetadata = {
  title: string
  handle: string
  code: string
  active: boolean
  alt: string
  original_filename: string
}

export type ImageProduct = Record<string, any> & {
  id: string
  parent_product_id: string
  parent_product_handle: string
  image_id: string
  image_title: string
  image_handle: string
  image_code: string
  image_url: string
  image_alt: string
  image_original_filename: string
  image_active: boolean
}

export function buildImageProductMetadata(input: {
  parentTitle: string
  parentHandle?: string | null
  imageId?: string | null
  sequence: number
  originalFilename: string
}): NormalizedImageProductMetadata {
  const filenameTitle = titleFromFilename(input.originalFilename)
  const title = filenameTitle || `${input.parentTitle} ${input.sequence}`
  const parentHandle = slugifyImageProductValue(
    input.parentHandle || input.parentTitle
  )
  const titleHandle = slugifyImageProductValue(title)

  return {
    title,
    handle: `${parentHandle}-${titleHandle}-${input.sequence}`,
    code: `${getCodePrefix(input.parentHandle || input.parentTitle)}-${String(
      input.sequence
    ).padStart(3, "0")}`,
    active: true,
    alt: title,
    original_filename: input.originalFilename,
  }
}

export function normalizeImageProductMetadata(input: {
  parent: ImageProductSource
  image: ImageProductSourceImage
  index: number
}): NormalizedImageProductMetadata {
  const metadata = input.image.metadata ?? {}
  const originalFilename = getString(metadata.original_filename)
  const isSingleImageAlbum = input.parent.images?.length === 1
  const fallbackTitle =
    titleFromFilename(originalFilename) ||
    (isSingleImageAlbum
      ? input.parent.title
      : `${input.parent.title} ${input.index + 1}`)
  const title =
    getString(metadata.title) || getString(metadata.alt) || fallbackTitle
  const parentHandle = slugifyImageProductValue(
    input.parent.handle || input.parent.title
  )
  const stableImageSuffix = slugifyImageProductValue(
    input.image.id.replace(/^img_/, "")
  ).slice(-12)
  const fallbackHandle = isSingleImageAlbum
    ? parentHandle
    : `${parentHandle}-${stableImageSuffix || input.index + 1}`
  const active =
    metadata.active !== false && metadata.visibility !== "hidden"

  return {
    title,
    handle: slugifyImageProductValue(getString(metadata.handle)) || fallbackHandle,
    code:
      getString(metadata.code) ||
      (isSingleImageAlbum
        ? getString(input.parent.variants?.[0]?.sku)
        : "") ||
      `${getCodePrefix(input.parent.handle || input.parent.title)}-${String(
        input.index + 1
      ).padStart(3, "0")}`,
    active,
    alt: getString(metadata.alt) || title,
    original_filename: originalFilename,
  }
}

export function projectImageProducts(
  parents: ImageProductSource[]
): ImageProduct[] {
  const projected: ImageProduct[] = []

  parents.forEach((parent) => {
    if (isHiddenStorefrontParent(parent)) {
      return
    }

    ;(parent.images ?? []).forEach((image, index) => {
      const imageMetadata = normalizeImageProductMetadata({
        parent,
        image,
        index,
      })

      if (!imageMetadata.active || !image.id || !image.url) {
        return
      }

      const virtualId = `${IMAGE_PRODUCT_ID_PREFIX}${image.id}`

      projected.push({
          ...parent,
          id: virtualId,
          title: imageMetadata.title,
          handle: imageMetadata.handle,
          thumbnail: image.url,
          images: [
            {
              ...image,
              metadata: {
                ...(image.metadata ?? {}),
                ...imageMetadata,
              },
            },
          ],
          created_at: image.created_at ?? parent.created_at,
          updated_at: image.updated_at ?? parent.updated_at,
          parent_product_id: parent.id,
          parent_product_handle: parent.handle ?? "",
          image_id: image.id,
          image_title: imageMetadata.title,
          image_handle: imageMetadata.handle,
          image_code: imageMetadata.code,
          image_url: image.url,
          image_alt: imageMetadata.alt,
          image_original_filename: imageMetadata.original_filename,
          image_active: imageMetadata.active,
          metadata: {
            ...(parent.metadata ?? {}),
            ttv_virtual_product: true,
            ttv_virtual_product_id: virtualId,
            ttv_parent_product_id: parent.id,
            ttv_parent_product_handle: parent.handle ?? "",
            ttv_image_id: image.id,
            ttv_image_title: imageMetadata.title,
            ttv_image_handle: imageMetadata.handle,
            ttv_image_code: imageMetadata.code,
            ttv_image_url: image.url,
            ttv_image_alt: imageMetadata.alt,
            ttv_image_original_filename: imageMetadata.original_filename,
          },
        } as ImageProduct)
    })
  })

  return projected
}

export function slugifyImageProductValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function titleFromFilename(filename: string) {
  const withoutExtension = filename.replace(/\.[a-z0-9]+$/i, "")
  const normalized = withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!normalized || /^(image|img|photo|picture|untitled)\s*\d*$/i.test(normalized)) {
    return ""
  }

  return normalized.replace(/\b\w/g, (character) => character.toUpperCase())
}

function getCodePrefix(value: string) {
  const words = slugifyImageProductValue(value).split("-").filter(Boolean)
  const initials = words.map((word) => word[0]).join("").slice(0, 6)

  return (initials || "ART").toUpperCase()
}

function isHiddenStorefrontParent(parent: ImageProductSource) {
  const metadata = parent.metadata ?? {}
  const hasTechnicalVariant = parent.variants?.some(
    (variant: { sku?: string | null }) =>
      variant.sku === "TTV-CUSTOM-HEXAGON-POSTER"
  )

  return Boolean(
    metadata.hidden_from_storefront === true ||
      metadata.hidden_from_store === true ||
      metadata.ttv_custom_type === "hexagon_poster" ||
      hasTechnicalVariant ||
      parent.handle === "custom-hexagon-poster" ||
      parent.handle === "custom-wall-poster"
  )
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}
