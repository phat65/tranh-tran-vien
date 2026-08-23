import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

import {
  normalizeImageProductMetadata,
  promoteGalleryImage,
  slugifyImageProductValue,
} from "../../../../../lib/image-products"

type ProductImageRecord = {
  id: string
  url: string
  rank?: number | null
  metadata?: Record<string, unknown> | null
}

type ProductRecord = {
  id: string
  title: string
  handle?: string | null
  thumbnail?: string | null
  images?: ProductImageRecord[] | null
}

const updateImageSchema = z.object({
  action: z.literal("update_image"),
  product_id: z.string().min(1),
  image_id: z.string().min(1),
  patch: z
    .object({
      title: z.string().trim().min(1).max(160).optional(),
      handle: z.string().trim().min(1).max(200).optional(),
      code: z.string().trim().min(1).max(80).optional(),
      active: z.boolean().optional(),
      alt: z.string().trim().max(250).optional(),
      original_filename: z.string().trim().max(250).optional(),
      role: z.enum(["primary", "gallery"]).optional(),
      primary_image_id: z.string().trim().max(200).nullable().optional(),
    })
    .strict(),
})

const reorderImagesSchema = z.object({
  action: z.literal("reorder_images"),
  product_id: z.string().min(1),
  image_ids: z.array(z.string().min(1)).min(1),
})

const deleteImageSchema = z.object({
  action: z.literal("delete_image"),
  product_id: z.string().min(1),
  image_id: z.string().min(1),
})

const deleteImagesSchema = z.object({
  action: z.literal("delete_images"),
  product_id: z.string().min(1),
  image_ids: z.array(z.string().min(1)).min(1),
})

const promoteGallerySchema = z.object({
  action: z.literal("promote_gallery"),
  product_id: z.string().min(1),
  image_id: z.string().min(1),
})

const patchSchema = z.discriminatedUnion("action", [
  updateImageSchema,
  reorderImagesSchema,
  deleteImageSchema,
  deleteImagesSchema,
  promoteGallerySchema,
])

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId = getQueryString(req.query.product_id)

  if (!productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "product_id is required."
    )
  }

  const product = await getProduct(req, productId)

  res.status(200).json(toResponse(product))
}

export async function PATCH(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const parsed = patchSchema.safeParse(req.body)

  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message ?? "Invalid image product update."
    )
  }

  const input = parsed.data
  const product = await getProduct(req, input.product_id)
  const currentImages = product.images ?? []
  let nextImages = currentImages
  let nextThumbnail = product.thumbnail

  if (input.action === "update_image") {
    const currentImage = currentImages.find(
      (image) => image.id === input.image_id
    )

    if (!currentImage) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Product image not found."
      )
    }

    const normalizedPatch = {
      ...input.patch,
      ...(input.patch.handle
        ? { handle: slugifyImageProductValue(input.patch.handle) }
        : {}),
    }

    if ("handle" in normalizedPatch && !normalizedPatch.handle) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Image product handle must contain letters or numbers."
      )
    }

    if (
      normalizedPatch.handle &&
      (normalizedPatch.role ??
        normalizeImageProductMetadata({
          parent: product,
          image: currentImage,
          index: currentImages.indexOf(currentImage),
        }).role) === "primary"
    ) {
      await ensureUniqueHandle(req, normalizedPatch.handle, input.image_id)
    }

    nextImages = currentImages.map((image) =>
      image.id === input.image_id
        ? {
            ...image,
            metadata: {
              ...(image.metadata ?? {}),
              ...normalizedPatch,
            },
          }
        : image
    )
  }

  if (input.action === "reorder_images") {
    const requestedIds = Array.from(new Set(input.image_ids))
    const currentIds = currentImages.map((image) => image.id)

    if (
      requestedIds.length !== currentIds.length ||
      currentIds.some((imageId) => !requestedIds.includes(imageId))
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "image_ids must contain every product image exactly once."
      )
    }

    const imagesById = new Map(
      currentImages.map((image) => [image.id, image] as const)
    )
    nextImages = requestedIds.map((imageId) => imagesById.get(imageId)!)
  }

  if (input.action === "delete_image") {
    if (!currentImages.some((image) => image.id === input.image_id)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Product image not found."
      )
    }

    nextImages = currentImages.filter((image) => image.id !== input.image_id)
  }

  if (input.action === "delete_images") {
    const requestedIds = new Set(input.image_ids)
    const missingIds = input.image_ids.filter(
      (imageId) => !currentImages.some((image) => image.id === imageId)
    )

    if (missingIds.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product image not found: ${missingIds.join(", ")}`
      )
    }

    nextImages = currentImages.filter((image) => !requestedIds.has(image.id))
  }

  if (input.action === "promote_gallery") {
    const promoted = promoteGalleryImage({
      parent: product,
      images: currentImages,
      galleryImageId: input.image_id,
    })

    if (!promoted) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only a gallery image linked to an existing primary can become the primary image."
      )
    }

    nextImages = promoted.images as ProductImageRecord[]
    const previousPrimary = currentImages.find(
      (image) => image.id === promoted.previousPrimaryImageId
    )
    const selectedImage = currentImages.find(
      (image) => image.id === input.image_id
    )

    if (
      previousPrimary?.url === product.thumbnail &&
      selectedImage?.url
    ) {
      nextThumbnail = selectedImage.url
    }
  }

  validateImageRoles(product, nextImages)

  await updateProductsWorkflow(req.scope).run({
    input: {
      selector: { id: product.id },
      update: {
        images: nextImages.map((image) => ({
          id: image.id,
          url: image.url,
          metadata: image.metadata ?? {},
        })),
        thumbnail: nextImages.some((image) => image.url === nextThumbnail)
          ? nextThumbnail
          : (nextImages[0]?.url ?? null),
      },
    },
  })

  const updatedProduct = await getProduct(req, product.id)
  res.status(200).json(toResponse(updatedProduct))
}

async function getProduct(
  req: MedusaRequest,
  productId: string
): Promise<ProductRecord> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "thumbnail",
      "images.id",
      "images.url",
      "images.rank",
      "images.metadata",
    ],
    filters: { id: productId },
  })
  const product = (data as ProductRecord[])[0]

  if (!product) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found.")
  }

  return product
}

async function ensureUniqueHandle(
  req: MedusaRequest,
  handle: string,
  currentImageId: string
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "images.id",
      "images.url",
      "images.metadata",
    ],
    pagination: { skip: 0, take: 10000 },
  })

  const duplicate = (data as ProductRecord[]).some((product) =>
    (product.images ?? []).some((image, index) => {
      if (image.id === currentImageId) {
        return false
      }

      const normalized = normalizeImageProductMetadata({
        parent: product,
        image,
        index,
      })

      return normalized.role === "primary" && normalized.handle === handle
    })
  )

  if (duplicate) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Image product handle "${handle}" is already in use.`
    )
  }
}

function toResponse(product: ProductRecord) {
  const normalizedImages = (product.images ?? []).map((image, index) => ({
    image,
    metadata: normalizeImageProductMetadata({ parent: product, image, index }),
  }))

  return {
    product_id: product.id,
    product_title: product.title,
    images: normalizedImages.map(({ image, metadata }, index) => ({
      image_id: image.id,
      virtual_product_id: `imgprod_${image.id}`,
      url: image.url,
      sort_order: index,
      ...metadata,
      gallery_count:
        metadata.role === "primary"
          ? normalizedImages.filter(
              (candidate) =>
                candidate.metadata.role === "gallery" &&
                candidate.metadata.primary_image_id === image.id
            ).length
          : 0,
    })),
  }
}

function validateImageRoles(
  product: ProductRecord,
  images: ProductImageRecord[]
) {
  const normalizedImages = images.map((image, index) => ({
    image,
    metadata: normalizeImageProductMetadata({
      parent: { ...product, images },
      image,
      index,
    }),
  }))
  const primaryIds = new Set(
    normalizedImages
      .filter((entry) => entry.metadata.role === "primary")
      .map((entry) => entry.image.id)
  )
  const invalidGallery = normalizedImages.find(
    (entry) =>
      entry.metadata.role === "gallery" &&
      (!entry.metadata.primary_image_id ||
        entry.metadata.primary_image_id === entry.image.id ||
        !primaryIds.has(entry.metadata.primary_image_id))
  )

  if (invalidGallery) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Each gallery image must reference an existing primary image product."
    )
  }
}

function getQueryString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}
