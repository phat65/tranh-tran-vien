import { type Dirent, promises as fs } from "fs"
import path from "path"

import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  deleteInventoryItemWorkflow,
  deleteProductsWorkflow,
  deleteReservationsWorkflow,
} from "@medusajs/medusa/core-flows"

import { BRAND_MODULE } from "../../modules/brand"
import { TAXONOMY_MODULE } from "../../modules/taxonomy"

type IdRecord = {
  id: string
}

type ProductRecord = IdRecord & {
  title?: string | null
  handle?: string | null
}

type InventoryItemRecord = IdRecord & {
  sku?: string | null
  title?: string | null
}

type TaxonomyRecord = IdRecord & {
  code: string
}

type TaxonomyTermRecord = IdRecord & {
  taxonomy_id: string
  image_url?: string | null
  metadata?: Record<string, unknown> | null
}

const PAGE_SIZE = 100
const DELETE_BATCH_SIZE = 20

const EXPLORE_GROUP_CODES = [
  "explore_shop_by_shape",
  "explore_shop_by_category",
  "explore_popular_anime",
  "explore_popular_games",
  "explore_shop_extras",
]

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".webp",
])

export default async function reset_test_data({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info("Resetting Tranh Tran Vien test data...")

  await clearProducts(container)
  await clearInventory(container)
  await clearExploreGalleries(container)
  await clearImageFiles()

  logger.info("Finished resetting Tranh Tran Vien test data.")
  console.log("reset_test_data=done")
}

async function clearProducts(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const brandService = container.resolve(BRAND_MODULE) as any
  const taxonomyService = container.resolve(TAXONOMY_MODULE) as any
  const products = await listAll<ProductRecord>(query, "product", [
    "id",
    "title",
    "handle",
  ])

  if (!products.length) {
    logger.info("No active products found.")
    console.log("active_products=0")
    return
  }

  logger.info(`Deleting ${products.length} product(s)...`)
  console.log(`deleting_products=${products.length}`)

  for (const product of products) {
    const productBrands = (await brandService.listProductBrands({
      product_id: product.id,
    })) as IdRecord[]
    if (productBrands.length) {
      await brandService.deleteProductBrands(
        productBrands.map((link) => link.id)
      )
    }

    const productTaxonomyTerms =
      (await taxonomyService.listProductTaxonomyTerms({
        product_id: product.id,
      })) as IdRecord[]
    if (productTaxonomyTerms.length) {
      await taxonomyService.deleteProductTaxonomyTerms(
        productTaxonomyTerms.map((link) => link.id)
      )
    }
  }

  for (const batch of chunk(products, DELETE_BATCH_SIZE)) {
    await deleteProductsWorkflow(container).run({
      input: {
        ids: batch.map((product) => product.id),
      },
    })
  }

  logger.info(`Deleted ${products.length} product(s).`)
  console.log(`deleted_products=${products.length}`)
}

async function clearInventory(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const reservationItems = await listAll<IdRecord>(query, "reservation_item", [
    "id",
  ])

  if (reservationItems.length) {
    logger.info(`Deleting ${reservationItems.length} reservation item(s)...`)
    console.log(`deleting_reservation_items=${reservationItems.length}`)
    await deleteReservationsWorkflow(container).run({
      input: {
        ids: reservationItems.map((item) => item.id),
      },
    })
  } else {
    console.log("active_reservation_items=0")
  }

  const inventoryItems = await listAll<InventoryItemRecord>(
    query,
    "inventory_item",
    ["id", "sku", "title"]
  )

  if (!inventoryItems.length) {
    logger.info("No active inventory items found.")
    console.log("active_inventory_items=0")
    return
  }

  logger.info(`Deleting ${inventoryItems.length} inventory item(s)...`)
  console.log(`deleting_inventory_items=${inventoryItems.length}`)

  for (const batch of chunk(inventoryItems, DELETE_BATCH_SIZE)) {
    await deleteInventoryItemWorkflow(container).run({
      input: batch.map((item) => item.id),
    })
  }

  logger.info(`Deleted ${inventoryItems.length} inventory item(s).`)
  console.log(`deleted_inventory_items=${inventoryItems.length}`)
}

async function clearExploreGalleries(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const taxonomyService = container.resolve(TAXONOMY_MODULE) as any
  const taxonomies = (await taxonomyService.listTaxonomies(
    { code: EXPLORE_GROUP_CODES },
    { take: 100 }
  )) as TaxonomyRecord[]
  const taxonomyIds = new Set(taxonomies.map((taxonomy) => taxonomy.id))

  if (!taxonomyIds.size) {
    logger.info("No Explore groups found for gallery cleanup.")
    console.log("explore_gallery_terms=0")
    return
  }

  let cleared = 0

  for (const taxonomyId of taxonomyIds) {
    const terms = (await taxonomyService.listTaxonomyTerms(
      { taxonomy_id: taxonomyId },
      { take: 500 }
    )) as TaxonomyTermRecord[]

    for (const term of terms) {
      const metadata = { ...(term.metadata ?? {}) }
      delete metadata.gallery_images

      await taxonomyService.updateTaxonomyTerms({
        selector: { id: term.id },
        data: {
          image_url: null,
          metadata,
        },
      })
      cleared += 1
    }
  }

  logger.info(`Cleared Explore gallery metadata for ${cleared} term(s).`)
  console.log(`cleared_explore_gallery_terms=${cleared}`)
}

async function clearImageFiles() {
  const roots = [
    path.resolve(process.cwd(), "static"),
    path.resolve(process.cwd(), "../storefront/public/custom-wall-uploads"),
  ]

  let deleted = 0

  for (const root of roots) {
    deleted += await deleteImagesInDirectory(root)
  }

  console.log(`deleted_image_files=${deleted}`)
}

async function deleteImagesInDirectory(root: string): Promise<number> {
  let entries: Dirent<string>[]

  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return 0
    }

    throw error
  }

  let deleted = 0

  for (const entry of entries) {
    const fullPath = path.resolve(root, entry.name)

    if (!isInside(root, fullPath)) {
      continue
    }

    if (entry.isDirectory()) {
      deleted += await deleteImagesInDirectory(fullPath)
      await removeDirectoryIfEmpty(fullPath)
      continue
    }

    if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      await fs.rm(fullPath, { force: true })
      deleted += 1
    }
  }

  await removeDirectoryIfEmpty(root)

  return deleted
}

async function removeDirectoryIfEmpty(directory: string) {
  try {
    const entries = await fs.readdir(directory)
    if (!entries.length) {
      await fs.rmdir(directory)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }
  }
}

async function listAll<T>(
  query: any,
  entity: string,
  fields: string[]
): Promise<T[]> {
  const records: T[] = []
  let offset = 0

  while (true) {
    const { data } = await query.graph({
      entity,
      fields,
      pagination: {
        skip: offset,
        take: PAGE_SIZE,
      },
    })

    const page = data as T[]
    records.push(...page)

    if (page.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE
  }

  return records
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function isInside(root: string, target: string) {
  const relative = path.relative(path.resolve(root), path.resolve(target))

  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative)
}
