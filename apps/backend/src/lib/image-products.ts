export const IMAGE_PRODUCT_ID_PREFIX = "imgprod_"

export type ImageProductRole = "primary" | "gallery"

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
  role: ImageProductRole
  primary_image_id: string
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
  image_role: ImageProductRole
  gallery_image_ids: string[]
  production_image_url: string
}

export function buildImageProductMetadata(input: {
  parentTitle: string
  parentHandle?: string | null
  imageId?: string | null
  sequence: number
  originalFilename: string
  role?: ImageProductRole
  primaryImageId?: string | null
}): NormalizedImageProductMetadata {
  const filenameTitle = titleFromFilename(input.originalFilename)
  const title = filenameTitle || `${input.parentTitle} ${input.sequence}`
  const parentHandle = slugifyImageProductValue(
    input.parentHandle || input.parentTitle
  )
  const titleHandle = slugifyImageProductValue(title)
  const role = input.role ?? "primary"

  return {
    title,
    handle: `${parentHandle}-${titleHandle}-${input.sequence}`,
    code: `${getCodePrefix(input.parentHandle || input.parentTitle)}-${String(
      input.sequence
    ).padStart(3, "0")}`,
    active: true,
    alt: title,
    original_filename: input.originalFilename,
    role,
    primary_image_id:
      role === "gallery" ? String(input.primaryImageId ?? "").trim() : "",
  }
}

export function normalizeImageProductMetadata(input: {
  parent: ImageProductSource
  image: ImageProductSourceImage
  index: number
}): NormalizedImageProductMetadata {
  const metadata = input.image.metadata ?? {}
  const originalFilename = getString(metadata.original_filename)
  const role: ImageProductRole =
    metadata.role === "gallery" ? "gallery" : "primary"
  const primaryImageId =
    role === "gallery"
      ? getString(
          metadata.primary_image_id ?? metadata.virtual_product_image_id
        )
      : ""
  const primaryImageCount = (input.parent.images ?? []).filter(
    (image) => image.metadata?.role !== "gallery"
  ).length
  const isSingleImageAlbum = primaryImageCount === 1 && role === "primary"
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
  const active = metadata.active !== false && metadata.visibility !== "hidden"

  return {
    title,
    handle:
      slugifyImageProductValue(getString(metadata.handle)) || fallbackHandle,
    code:
      getString(metadata.code) ||
      (isSingleImageAlbum ? getString(input.parent.variants?.[0]?.sku) : "") ||
      `${getCodePrefix(input.parent.handle || input.parent.title)}-${String(
        input.index + 1
      ).padStart(3, "0")}`,
    active,
    alt: getString(metadata.alt) || title,
    original_filename: originalFilename,
    role,
    primary_image_id: primaryImageId,
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

    const images = parent.images ?? []
    const normalizedImages = images.map((image, index) => ({
      image,
      metadata: normalizeImageProductMetadata({ parent, image, index }),
    }))

    normalizedImages.forEach(({ image, metadata: imageMetadata }) => {
      if (
        imageMetadata.role !== "primary" ||
        !imageMetadata.active ||
        !image.id ||
        !image.url
      ) {
        return
      }

      const virtualId = `${IMAGE_PRODUCT_ID_PREFIX}${image.id}`
      const galleryImages = normalizedImages
        .filter(
          (candidate) =>
            candidate.metadata.role === "gallery" &&
            candidate.metadata.primary_image_id === image.id &&
            candidate.metadata.active &&
            candidate.image.id &&
            candidate.image.url
        )
        .map((candidate) => ({
          ...candidate.image,
          metadata: {
            ...(candidate.image.metadata ?? {}),
            ...candidate.metadata,
          },
        }))
      const storefrontImages = [
        {
          ...image,
          metadata: {
            ...(image.metadata ?? {}),
            ...imageMetadata,
          },
        },
        ...galleryImages,
      ]

      projected.push({
        ...parent,
        id: virtualId,
        title: imageMetadata.title,
        handle: imageMetadata.handle,
        thumbnail: image.url,
        images: storefrontImages,
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
        image_role: imageMetadata.role,
        gallery_image_ids: galleryImages.map((gallery) => gallery.id),
        production_image_url: image.url,
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
          ttv_image_role: imageMetadata.role,
          ttv_gallery_image_ids: galleryImages.map((gallery) => gallery.id),
          ttv_production_image_url: image.url,
        },
      } as ImageProduct)
    })
  })

  return projected
}

export function promoteGalleryImage(input: {
  parent: ImageProductSource
  images: ImageProductSourceImage[]
  galleryImageId: string
}) {
  const normalized = input.images.map((image, index) => ({
    image,
    metadata: normalizeImageProductMetadata({
      parent: { ...input.parent, images: input.images },
      image,
      index,
    }),
  }))
  const selected = normalized.find(
    (entry) => entry.image.id === input.galleryImageId
  )
  const previousPrimaryImageId = selected?.metadata.primary_image_id ?? ""
  const previousPrimary = normalized.find(
    (entry) =>
      entry.image.id === previousPrimaryImageId &&
      entry.metadata.role === "primary"
  )

  if (selected?.metadata.role !== "gallery" || !previousPrimary) {
    return null
  }

  return {
    previousPrimaryImageId,
    images: normalized.map(({ image, metadata }) => {
      if (image.id === selected.image.id) {
        return {
          ...image,
          metadata: {
            ...(image.metadata ?? {}),
            role: "primary" as const,
            primary_image_id: "",
          },
        }
      }

      if (
        image.id === previousPrimaryImageId ||
        (metadata.role === "gallery" &&
          metadata.primary_image_id === previousPrimaryImageId)
      ) {
        return {
          ...image,
          metadata: {
            ...(image.metadata ?? {}),
            role: "gallery" as const,
            primary_image_id: selected.image.id,
          },
        }
      }

      return image
    }),
  }
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

  if (
    !normalized ||
    /^(image|img|photo|picture|untitled)\s*\d*$/i.test(normalized)
  ) {
    return ""
  }

  return normalized.replace(/\b\w/g, (character) => character.toUpperCase())
}

function getCodePrefix(value: string) {
  const words = slugifyImageProductValue(value).split("-").filter(Boolean)
  const initials = words
    .map((word) => word[0])
    .join("")
    .slice(0, 6)

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
