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

const PAGE_SIZE = 100
const DELETE_BATCH_SIZE = 20

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
  await clearImageFiles()

  logger.info("Finished resetting Tranh Tran Vien test data.")
  console.log("reset_test_data=done")
}

async function clearProducts(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const brandService = container.resolve(BRAND_MODULE) as any
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

    if (
      entry.isFile() &&
      IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
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

  return (
    Boolean(relative) &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  )
}
