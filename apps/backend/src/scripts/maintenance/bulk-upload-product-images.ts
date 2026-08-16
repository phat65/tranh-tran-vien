import { promises as fs } from "fs"
import path from "path"

import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  updateProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"

import { DRAGON_BALL_HEXAGON_PRODUCT_SEEDS } from "../../data/dragon-ball-hexagon-products"

type ProductRecord = {
  id: string
  title?: string | null
  handle?: string | null
  thumbnail?: string | null
  metadata?: Record<string, unknown> | null
  images?: {
    id?: string
    url: string
    rank?: number | null
  }[]
  variants?: {
    sku?: string | null
  }[]
}

type ImageAssignment = {
  product: ProductRecord
  files: string[]
}

const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"])
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
}

export default async function bulk_upload_product_images({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const replaceImages = getFlag("replace", "PRODUCT_IMAGE_REPLACE")
  const dryRun = getFlag("dry-run", "PRODUCT_IMAGE_DRY_RUN")
  const thumbnailOnly = getFlag(
    "thumbnail-only",
    "PRODUCT_IMAGE_THUMBNAIL_ONLY"
  )
  const allProducts = getFlag("all-products", "PRODUCT_IMAGE_ALL_PRODUCTS")
  const forceThumbnail = getFlag(
    "force-thumbnail",
    "PRODUCT_IMAGE_FORCE_THUMBNAIL"
  )
  const explicitOnly = getFlag("explicit-only", "PRODUCT_IMAGE_EXPLICIT_ONLY")
  const inputDir = allProducts && thumbnailOnly ? null : getInputDirectory()
  const absoluteInputDir = inputDir ? path.resolve(process.cwd(), inputDir) : null
  const products = await loadProducts(container)
  const assignments =
    thumbnailOnly && allProducts
      ? products.map((product) => ({
          product,
          files: [],
        }))
      : await collectAssignments(absoluteInputDir!, products, explicitOnly)

  if (!assignments.length) {
    logger.info("No product image assignments found.")
    console.log("bulk_product_image_assignments=0")
    return
  }

  logger.info(
    absoluteInputDir
      ? `Found ${assignments.length} product(s) with image files in ${absoluteInputDir}.`
      : `Found ${assignments.length} product(s) to inspect for thumbnail sync.`
  )
  console.log(`bulk_product_image_assignments=${assignments.length}`)

  if (dryRun) {
    assignments.forEach((assignment) => {
      console.log(
        `dry_run product=${assignment.product.handle} files=${assignment.files.length}`
      )
    })
    return
  }

  let uploadedCount = 0

  for (const assignment of assignments) {
    const product = assignment.product
    const handle = product.handle ?? product.id

    if (thumbnailOnly) {
      const thumbnail = getThumbnailFromExistingImages(product)

      if (!thumbnail) {
        console.warn(`No existing image found for thumbnail: ${handle}`)
        continue
      }

      await updateProductsWorkflow(container).run({
        input: {
          products: [
            {
              id: product.id,
              thumbnail,
            },
          ],
        },
      })

      logger.info(`Updated thumbnail for ${product.title ?? handle}.`)
      console.log(`updated_thumbnail=${handle}`)
      continue
    }

    let sequence = replaceImages ? 1 : getNextImageSequence(product, handle)
    const uploadedUrls: string[] = []

    for (const filePath of assignment.files) {
      const extension = path.extname(filePath).toLowerCase()
      const content = await fs.readFile(filePath)
      const filename = `products/${slugify(handle)}/${slugify(handle)}-${sequence}${extension}`
      const { result } = await uploadFilesWorkflow(container).run({
        input: {
          files: [
            {
              filename,
              mimeType: MIME_TYPES[extension],
              content: content.toString("base64"),
              access: "public",
            },
          ],
        },
      })
      const uploaded = result[0]

      if (!uploaded?.url) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Upload did not return URL for ${filePath}`
        )
      }

      uploadedUrls.push(uploaded.url)
      uploadedCount += 1
      sequence += 1
    }

    const existingImages = replaceImages
      ? []
      : (product.images ?? []).map((image) => ({
          ...(image.id ? { id: image.id } : {}),
          url: image.url,
        }))
    const nextImages = [
      ...existingImages,
      ...uploadedUrls.map((url) => ({ url })),
    ]

    await updateProductsWorkflow(container).run({
      input: {
        products: [
          {
            id: product.id,
            images: nextImages,
            thumbnail:
              forceThumbnail || replaceImages || !product.thumbnail
                ? uploadedUrls[0] ?? product.thumbnail
                : product.thumbnail,
          },
        ],
      },
    })

    logger.info(
      `Uploaded ${uploadedUrls.length} image(s) to ${product.title ?? handle}.`
    )
    console.log(`uploaded_product=${handle} images=${uploadedUrls.length}`)
  }

  console.log(`uploaded_product_images=${uploadedCount}`)
}

async function loadProducts(container: MedusaContainer): Promise<ProductRecord[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const products: ProductRecord[] = []
  let offset = 0
  const take = 100

  while (true) {
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
        "images.rank",
        "variants.sku",
      ],
      pagination: {
        skip: offset,
        take,
      },
    })
    const page = data as ProductRecord[]
    products.push(...page)

    if (page.length < take) {
      break
    }

    offset += take
  }

  return products
}

async function collectAssignments(
  inputDir: string,
  products: ProductRecord[],
  explicitOnly = false
): Promise<ImageAssignment[]> {
  const productByKey = buildProductLookup(products)
  const productByUploadFileName = buildProductUploadFileLookup(products)
  const assignmentByProductId = new Map<string, ImageAssignment>()
  const entries = await fs.readdir(inputDir, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(inputDir, entry.name)

    if (entry.isDirectory()) {
      const product = productByKey.get(entry.name.toLowerCase())

      if (!product) {
        console.warn(`No product matched image folder: ${entry.name}`)
        continue
      }

      const files = await listImageFiles(entryPath)
      addAssignment(assignmentByProductId, product, files)
      continue
    }

    if (!entry.isFile() || !isSupportedImage(entry.name)) {
      continue
    }

    const explicitProduct = productByUploadFileName.get(
      normalizeUploadFileName(entry.name)
    )
    const product =
      explicitProduct ??
      (explicitOnly ? null : matchProductForRootFile(entry.name, products))

    if (!product) {
      if (!explicitOnly) {
        console.warn(`No product matched image file: ${entry.name}`)
      }
      continue
    }

    addAssignment(assignmentByProductId, product, [entryPath])
  }

  return Array.from(assignmentByProductId.values()).map((assignment) => ({
    ...assignment,
    files: assignment.files.sort((first, second) =>
      first.localeCompare(second, undefined, { numeric: true })
    ),
  }))
}

function buildProductLookup(products: ProductRecord[]) {
  const lookup = new Map<string, ProductRecord>()

  for (const product of products) {
    for (const key of getProductMatchKeys(product)) {
      lookup.set(key, product)
    }
  }

  return lookup
}

function buildProductUploadFileLookup(products: ProductRecord[]) {
  const productByHandle = new Map(
    products
      .filter((product): product is ProductRecord & { handle: string } =>
        Boolean(product.handle)
      )
      .map((product) => [product.handle, product])
  )
  const lookup = new Map<string, ProductRecord>()

  for (const seed of DRAGON_BALL_HEXAGON_PRODUCT_SEEDS) {
    if (!seed.uploadFileName) {
      continue
    }

    const product = productByHandle.get(seed.handle)

    if (product) {
      lookup.set(normalizeUploadFileName(seed.uploadFileName), product)
    }
  }

  return lookup
}

function matchProductForRootFile(filename: string, products: ProductRecord[]) {
  const stem = path.basename(filename, path.extname(filename))
  const normalizedStem = normalizeMatchKey(stem)
  const candidates = products
    .filter((product) => {
      const keys = getProductMatchKeys(product)

      return keys.some(
        (key) =>
          normalizedStem === key ||
          normalizedStem.startsWith(`${key}-`) ||
          normalizedStem.startsWith(`${key}__`)
      )
    })
    .sort((first, second) => {
      const firstKeyLength = getLongestProductKey(first)
      const secondKeyLength = getLongestProductKey(second)

      return secondKeyLength - firstKeyLength
    })

  return candidates[0] ?? null
}

function getProductMatchKeys(product: ProductRecord) {
  const keys = new Set<string>()
  const sourceImagePath = getSourceImagePath(product.metadata)
  const sourceImageName = sourceImagePath
    ? path.basename(sourceImagePath, path.extname(sourceImagePath))
    : ""

  addMatchKey(keys, product.handle)
  addMatchKey(keys, product.title)
  addMatchKey(keys, sourceImageName)

  if (product.title?.startsWith("Dragon Ball - ")) {
    addMatchKey(keys, `Anime Luc Giac - ${product.title}`)
  }

  for (const variant of product.variants ?? []) {
    addMatchKey(keys, variant.sku)
  }

  return Array.from(keys)
}

function addMatchKey(keys: Set<string>, value: string | null | undefined) {
  if (!value) {
    return
  }

  keys.add(value.toLowerCase())
  keys.add(normalizeMatchKey(value))
}

function getSourceImagePath(metadata: ProductRecord["metadata"]) {
  const value = metadata?.source_image_path

  return typeof value === "string" ? value : ""
}

function getLongestProductKey(product: ProductRecord) {
  return getProductMatchKeys(product).reduce(
    (max, value) => Math.max(max, value.length),
    0
  )
}

function normalizeMatchKey(value: string) {
  return slugify(
    value
      .replace(/&/g, " and ")
      .replace(/\((\d+)\)/g, " $1 ")
      .replace(/\s+/g, " ")
  )
}

function normalizeUploadFileName(filename: string) {
  return filename.normalize("NFC").toLowerCase()
}

async function listImageFiles(directory: string) {
  const entries = await fs.readdir(directory, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && isSupportedImage(entry.name))
    .map((entry) => path.join(directory, entry.name))
    .sort((first, second) =>
      first.localeCompare(second, undefined, { numeric: true })
    )
}

function addAssignment(
  assignments: Map<string, ImageAssignment>,
  product: ProductRecord,
  files: string[]
) {
  if (!files.length) {
    return
  }

  const current = assignments.get(product.id)

  if (current) {
    current.files.push(...files)
    return
  }

  assignments.set(product.id, {
    product,
    files,
  })
}

function isSupportedImage(filename: string) {
  return SUPPORTED_EXTENSIONS.has(path.extname(filename).toLowerCase())
}

function getNextImageSequence(product: ProductRecord, handle: string) {
  const slug = slugify(handle)
  const highest = (product.images ?? []).reduce((max, image) => {
    const sequence = extractImageSequence(image.url, slug)

    return Math.max(max, sequence)
  }, 0)

  return highest + 1
}

function getThumbnailFromExistingImages(product: ProductRecord) {
  const images = [...(product.images ?? [])]
    .filter((image) => image.url)
    .sort((first, second) => (first.rank ?? 0) - (second.rank ?? 0))

  const uploadedImage =
    images.find((image) => !image.url.includes("/dot-1/")) ?? images[0]

  return uploadedImage?.url ?? null
}

function extractImageSequence(url: string, slug: string) {
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = url.match(
    new RegExp(`${escapedSlug}-(\\d+)(?=\\.[a-z0-9]+(?:\\?|#|$))`, "i")
  )
  const value = match ? Number(match[1]) : 0

  return Number.isFinite(value) ? value : 0
}

function getInputDirectory() {
  const dir =
    getArgValue("dir") ??
    process.env.PRODUCT_IMAGE_DIR ??
    process.env.BULK_PRODUCT_IMAGE_DIR

  if (!dir) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing product image directory. Pass --dir=... or set PRODUCT_IMAGE_DIR."
    )
  }

  return dir
}

function getArgValue(name: string) {
  const prefix = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))

  if (inline) {
    return inline.slice(prefix.length)
  }

  const index = process.argv.indexOf(`--${name}`)

  return index >= 0 ? process.argv[index + 1] : undefined
}

function getFlag(argName: string, envName: string) {
  return (
    process.argv.includes(`--${argName}`) ||
    process.env[envName]?.toLowerCase() === "true"
  )
}

function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "product"
}
