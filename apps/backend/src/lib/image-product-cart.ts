import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

import {
  IMAGE_PRODUCT_ID_PREFIX,
  normalizeImageProductMetadata,
} from "./image-products"

type VariantRecord = {
  id: string
  product?: {
    id: string
    title: string
    handle?: string | null
    images?: Array<{
      id: string
      url: string
      metadata?: Record<string, unknown> | null
    }> | null
  } | null
}

export async function canonicalizeImageProductLineMetadata(input: {
  scope: MedusaContainer
  variantId: string
  metadata: Record<string, unknown>
}) {
  const requestedImageId = getString(
    input.metadata.ttv_explore_image_id ?? input.metadata.ttv_image_id
  )

  if (!requestedImageId) {
    return input.metadata
  }

  const query = input.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "product.id",
      "product.title",
      "product.handle",
      "product.images.id",
      "product.images.url",
      "product.images.metadata",
    ],
    filters: { id: input.variantId },
  })
  const variant = (data as VariantRecord[])[0]
  const parent = variant?.product
  const images = parent?.images ?? []
  const imageIndex = images.findIndex((image) => image.id === requestedImageId)

  if (!variant || !parent || imageIndex < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Selected image does not belong to the product variant."
    )
  }

  const image = images[imageIndex]
  const normalized = normalizeImageProductMetadata({
    parent,
    image,
    index: imageIndex,
  })

  if (!normalized.active || normalized.role !== "primary") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Selected image product is not an active primary image."
    )
  }

  const galleryImageUrls = images
    .map((candidate, index) => ({
      candidate,
      metadata: normalizeImageProductMetadata({
        parent,
        image: candidate,
        index,
      }),
    }))
    .filter(
      (candidate) =>
        candidate.metadata.role === "gallery" &&
        candidate.metadata.primary_image_id === image.id &&
        candidate.metadata.active
    )
    .map((candidate) => candidate.candidate.url)

  return {
    ...input.metadata,
    ttv_source: "explore_image",
    ttv_virtual_product_id: `${IMAGE_PRODUCT_ID_PREFIX}${image.id}`,
    ttv_parent_product_id: parent.id,
    ttv_parent_product_handle: parent.handle ?? "",
    ttv_explore_image_id: image.id,
    ttv_explore_image_code: normalized.code,
    ttv_explore_image_name: normalized.title,
    ttv_explore_image_url: image.url,
    ttv_explore_image_alt: normalized.alt,
    ttv_image_product_handle: normalized.handle,
    ttv_explore_original_filename: normalized.original_filename,
    ttv_primary_image_id: image.id,
    ttv_print_file_url: image.url,
    ttv_display_image_url: image.url,
    ttv_gallery_image_urls: galleryImageUrls,
  }
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}
