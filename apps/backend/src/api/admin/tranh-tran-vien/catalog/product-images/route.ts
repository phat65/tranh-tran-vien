import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  updateProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"

import {
  buildImageProductMetadata,
  normalizeImageProductMetadata,
} from "../../../../../lib/image-products"
import {
  buildProductImageUploadTarget,
  getNextProductImageSequence,
  isSupportedProductImageFile,
} from "./helpers"

const PRODUCT_IMAGE_SEQUENCE_METADATA_KEY = "ttv_product_image_sequence"

type UploadedFile = {
  filename: string
  mime_type: string
  content: string
}

type ProductImageRecord = {
  id: string
  url: string
  metadata?: Record<string, unknown> | null
}

type ProductRecord = {
  id: string
  title: string
  handle?: string | null
  thumbnail?: string | null
  images?: ProductImageRecord[]
  metadata?: Record<string, unknown> | null
}

type FailedUpload = {
  filename: string
  message: string
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = req.body as Record<string, unknown>
  const productId = getString(body.product_id)
  const files = getUploadedFiles(body.files)
  const role = getUploadRole(body.role)

  if (!productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "product_id is required. Create the Medusa Product album first."
    )
  }

  if (!files.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Please select at least one image to upload."
    )
  }

  const product = await getProduct(req, productId)
  const currentImages = product.images ?? []
  const primaryImageId =
    role === "gallery" ? getPrimaryImageId(body) : ""

  if (role === "gallery") {
    const primaryIndex = currentImages.findIndex(
      (image) => image.id === primaryImageId
    )
    const primaryImage = currentImages[primaryIndex]

    if (
      !primaryImage ||
      normalizeImageProductMetadata({
        parent: product,
        image: primaryImage,
        index: primaryIndex,
      }).role !== "primary"
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Gallery uploads must reference an existing primary image product."
      )
    }
  }

  const failed: FailedUpload[] = []
  const validFiles = files.filter((file) => {
    const supported = isSupportedProductImageFile({
      filename: file.filename,
      mimeType: file.mime_type,
    })

    if (!supported) {
      failed.push({
        filename: file.filename,
        message: "Only JPG, PNG, and WebP images are supported.",
      })
    }

    return supported
  })

  if (!validFiles.length) {
    res.status(400).json({
      message: failed[0]?.message ?? "No supported images were selected.",
      uploaded_count: 0,
      failed_count: failed.length,
      failed,
    })
    return
  }

  const pathBaseName = product.handle || product.title
  let nextSequence = getNextProductImageSequence({
    images: currentImages,
    pathBaseName,
    storedSequence: getStoredSequence(product.metadata),
  })
  const uploadedImages: Array<{
    sequence: number
    url: string
    metadata: ReturnType<typeof buildImageProductMetadata>
  }> = []

  for (const file of validFiles) {
    const sequence = nextSequence
    const target = buildProductImageUploadTarget({
      displayBaseName: product.title,
      pathBaseName,
      sequence,
      originalFilename: file.filename,
    })

    try {
      const { result } = await uploadFilesWorkflow(req.scope).run({
        input: {
          files: [
            {
              filename: target.filename,
              mimeType: file.mime_type,
              content: file.content,
              access: "public",
            },
          ],
        },
      })
      const uploadedFile = result[0]

      if (!uploadedFile?.url) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Upload did not return an image URL."
        )
      }

      uploadedImages.push({
        sequence,
        url: uploadedFile.url,
        metadata: buildImageProductMetadata({
          parentTitle: product.title,
          parentHandle: product.handle,
          sequence,
          originalFilename: file.filename,
          role,
          primaryImageId,
        }),
      })
      nextSequence += 1
    } catch (error) {
      failed.push({
        filename: file.filename,
        message:
          error instanceof Error ? error.message : "Could not upload image.",
      })
    }
  }

  if (uploadedImages.length) {
    await updateProductsWorkflow(req.scope).run({
      input: {
        selector: { id: product.id },
        update: {
          images: [
            ...currentImages.map((image) => ({
              ...(image.id ? { id: image.id } : {}),
              url: image.url,
              metadata: image.metadata ?? {},
            })),
            ...uploadedImages.map((image) => ({
              url: image.url,
              metadata: image.metadata,
            })),
          ],
          thumbnail: product.thumbnail ?? uploadedImages[0].url,
          metadata: {
            ...(product.metadata ?? {}),
            [PRODUCT_IMAGE_SEQUENCE_METADATA_KEY]:
              uploadedImages[uploadedImages.length - 1].sequence,
          },
        },
      },
    })
  }

  res.status(200).json({
    product_id: product.id,
    product_title: product.title,
    uploaded_count: uploadedImages.length,
    failed_count: failed.length,
    role,
    primary_image_id: primaryImageId || null,
    uploaded_images: uploadedImages,
    failed,
  })
}

async function getProduct(req: MedusaRequest, productId: string) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "thumbnail",
      "metadata",
      "images.id",
      "images.url",
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

function getUploadedFiles(value: unknown): UploadedFile[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (file): file is UploadedFile =>
      Boolean(file) &&
      typeof file === "object" &&
      typeof file.filename === "string" &&
      typeof file.mime_type === "string" &&
      typeof file.content === "string" &&
      Boolean(file.content)
  )
}

function getStoredSequence(metadata?: Record<string, unknown> | null) {
  const current = Number(
    metadata?.[PRODUCT_IMAGE_SEQUENCE_METADATA_KEY] ??
      metadata?.ttv_explore_product_image_sequence
  )

  return Number.isSafeInteger(current) && current > 0 ? current : 0
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getUploadRole(value: unknown): "primary" | "gallery" {
  if (value === undefined || value === null || value === "") {
    return "primary"
  }

  if (value === "primary" || value === "gallery") {
    return value
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    'role must be either "primary" or "gallery".'
  )
}

function getPrimaryImageId(body: Record<string, unknown>) {
  const explicitPrimaryId = getString(body.primary_image_id)
  const parentProductId = getString(body.parent_product_id)
  const primaryImageId =
    explicitPrimaryId || parentProductId.replace(/^imgprod_/, "")

  if (!primaryImageId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "primary_image_id or parent_product_id is required for gallery uploads."
    )
  }

  return primaryImageId
}
