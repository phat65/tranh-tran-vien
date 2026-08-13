import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  updateProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"

import { getTaxonomyService, unique } from "../../utils"
import {
  buildProductImageUploadTarget,
  getNextProductImageSequence,
  isSupportedProductImageFile,
  slugify,
} from "./helpers"

const PRODUCT_IMAGE_SEQUENCE_METADATA_KEY = "ttv_explore_product_image_sequence"

type UploadedFile = {
  filename: string
  mime_type: string
  content: string
}

type TaxonomyRecord = {
  id: string
  code: string
}

type TaxonomyTermRecord = {
  id: string
  taxonomy_id: string
  name: string
  slug: string
}

type ProductTaxonomyTermRecord = {
  product_id: string
}

type ProductImageRecord = {
  id?: string
  url: string
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
  const termId = getString(body.term_id)
  const exploreHeading = getString(body.explore_heading)
  const files = getUploadedFiles(body.files)

  if (!termId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Please select an Explore Item before uploading images."
    )
  }

  if (!files.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Please select at least one image to upload."
    )
  }

  const taxonomyService = getTaxonomyService(req.scope)
  const term = await getExploreTerm(taxonomyService, termId, exploreHeading)
  const product = await getProductForExploreTerm(req, term)
  const failed: FailedUpload[] = []
  const validFiles = files.filter((file) => {
    const isSupported = isSupportedProductImageFile({
      filename: file.filename,
      mimeType: file.mime_type,
    })

    if (!isSupported) {
      failed.push({
        filename: file.filename,
        message: "Only JPG, PNG, and WebP images are supported.",
      })
    }

    return isSupported
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

  const currentImages = product.images ?? []
  let nextSequence = getNextProductImageSequence({
    images: currentImages,
    pathBaseName: term.slug || term.name || product.handle || product.title,
    storedSequence: getStoredSequence(product.metadata, term.id),
  })
  const uploadedImages: Array<{
    name: string
    sequence: number
    url: string
  }> = []

  for (const file of validFiles) {
    const sequence = nextSequence
    const target = buildProductImageUploadTarget({
      displayBaseName: product.title,
      pathBaseName: term.slug || term.name || product.handle || product.title,
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
        name: target.displayName,
        sequence,
        url: uploadedFile.url,
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
    const nextImages = [
      ...currentImages.map((image) => ({
        ...(image.id ? { id: image.id } : {}),
        url: image.url,
      })),
      ...uploadedImages.map((image) => ({ url: image.url })),
    ]
    const nextMetadata = setStoredSequence(
      product.metadata,
      term.id,
      uploadedImages[uploadedImages.length - 1].sequence
    )

    await updateProductsWorkflow(req.scope).run({
      input: {
        selector: { id: product.id },
        update: {
          images: nextImages,
          thumbnail: product.thumbnail ?? uploadedImages[0].url,
          metadata: nextMetadata,
        },
      },
    })
  }

  res.status(200).json({
    product_id: product.id,
    product_title: product.title,
    uploaded_count: uploadedImages.length,
    failed_count: failed.length,
    uploaded_images: uploadedImages,
    failed,
  })
}

async function getExploreTerm(
  taxonomyService: any,
  termId: string,
  exploreHeading: string
): Promise<TaxonomyTermRecord> {
  const terms = (await taxonomyService.listTaxonomyTerms({
    id: termId,
  })) as TaxonomyTermRecord[]
  const term = terms[0]

  if (!term) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Explore item not found.")
  }

  if (!exploreHeading) {
    return term
  }

  const taxonomies = (await taxonomyService.listTaxonomies({
    id: term.taxonomy_id,
  })) as TaxonomyRecord[]
  const taxonomy = taxonomies[0]

  if (taxonomy?.code !== exploreHeading) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Selected Explore Heading does not match the Explore Item."
    )
  }

  return term
}

async function getProductForExploreTerm(
  req: MedusaRequest,
  term: TaxonomyTermRecord
): Promise<ProductRecord> {
  const taxonomyService = getTaxonomyService(req.scope)
  const links = (await taxonomyService.listProductTaxonomyTerms({
    term_id: term.id,
  })) as ProductTaxonomyTermRecord[]
  const productIds = unique(
    links.map((link) => link.product_id).filter(Boolean)
  )

  if (productIds.length > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Multiple products are assigned to this Explore Item."
    )
  }

  if (productIds.length) {
    return getProductById(req, productIds[0])
  }

  const directProduct = await findProductByExploreItem(req, term)

  if (directProduct) {
    return directProduct
  }

  return createProductForExploreItem(req, term)
}

async function getProductById(
  req: MedusaRequest,
  productId: string
): Promise<ProductRecord> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const product = (await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "thumbnail",
      "metadata",
      "images.id",
      "images.url",
    ],
    filters: { id: productId },
  })) as { data?: ProductRecord[] }
  const foundProduct = product.data?.[0]

  if (!foundProduct) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product for this Explore Item was not found."
    )
  }

  return foundProduct
}

async function findProductByExploreItem(
  req: MedusaRequest,
  term: TaxonomyTermRecord
): Promise<ProductRecord | null> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const targetSlug = slugify(term.slug || term.name)
  const handleCandidates = unique([targetSlug, term.slug].filter(Boolean))
  const byHandle = await listProducts(req, {
    handle: handleCandidates,
  })

  if (byHandle.length === 1) {
    return byHandle[0]
  }

  if (byHandle.length > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Multiple products match Explore Item "${term.name}".`
    )
  }

  const { data } = await query.graph({
    entity: "product",
    fields: productLookupFields,
    filters: {
      title: term.name,
    },
  })
  const normalizedTermName = normalizeProductLookupValue(term.name)
  const titleMatches = (data as ProductRecord[]).filter((product) => {
    return (
      normalizeProductLookupValue(product.title) === normalizedTermName ||
      slugify(product.handle ?? "") === targetSlug
    )
  })

  if (titleMatches.length === 1) {
    return titleMatches[0]
  }

  if (titleMatches.length > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Multiple products match Explore Item "${term.name}".`
    )
  }

  return null
}

async function createProductForExploreItem(
  req: MedusaRequest,
  term: TaxonomyTermRecord
): Promise<ProductRecord> {
  const taxonomyService = getTaxonomyService(req.scope)
  const handle = slugify(term.slug || term.name)
  const { result } = await createProductsWorkflow(req.scope).run({
    input: {
      products: [
        {
          title: term.name,
          handle,
          status: ProductStatus.DRAFT,
          options: [
            {
              title: "Default",
              values: ["Default"],
            },
          ],
          metadata: {
            ttv_created_from_explore_item_id: term.id,
            ttv_created_from_explore_item_name: term.name,
            ttv_created_from_explore_upload: true,
          },
        },
      ],
    },
  })
  const productId = result[0]?.id

  if (!productId) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product could not be created for this Explore Item."
    )
  }

  await taxonomyService.createProductTaxonomyTerms([
    {
      product_id: productId,
      term_id: term.id,
      sort_order: 0,
      metadata: { source: "explore-upload" },
    },
  ])

  return getProductById(req, productId)
}

async function listProducts(
  req: MedusaRequest,
  filters: Record<string, unknown>
): Promise<ProductRecord[]> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: productLookupFields,
    filters,
  })

  return data as ProductRecord[]
}

const productLookupFields = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "metadata",
  "images.id",
  "images.url",
]

function normalizeProductLookupValue(value: string) {
  return slugify(value).replace(/-/g, "")
}

function getUploadedFiles(value: unknown): UploadedFile[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((file): UploadedFile | null => {
      if (!file || typeof file !== "object" || Array.isArray(file)) {
        return null
      }

      const candidate = file as Record<string, unknown>
      const filename = getString(candidate.filename)
      const mimeType = getString(candidate.mime_type)
      const content = getString(candidate.content)

      if (!filename || !mimeType || !content) {
        return null
      }

      return {
        filename,
        mime_type: mimeType,
        content,
      }
    })
    .filter((file): file is UploadedFile => Boolean(file))
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getStoredSequence(
  metadata: ProductRecord["metadata"],
  termId: string
) {
  const sequenceByTerm = metadata?.[PRODUCT_IMAGE_SEQUENCE_METADATA_KEY]

  if (!sequenceByTerm || typeof sequenceByTerm !== "object") {
    return 0
  }

  const sequence = (sequenceByTerm as Record<string, unknown>)[termId]

  return typeof sequence === "number" && Number.isFinite(sequence) ? sequence : 0
}

function setStoredSequence(
  metadata: ProductRecord["metadata"],
  termId: string,
  sequence: number
) {
  const currentMetadata = metadata ?? {}
  const sequenceByTerm = currentMetadata[PRODUCT_IMAGE_SEQUENCE_METADATA_KEY]

  return {
    ...currentMetadata,
    [PRODUCT_IMAGE_SEQUENCE_METADATA_KEY]: {
      ...(sequenceByTerm && typeof sequenceByTerm === "object"
        ? (sequenceByTerm as Record<string, unknown>)
        : {}),
      [termId]: sequence,
    },
  }
}
