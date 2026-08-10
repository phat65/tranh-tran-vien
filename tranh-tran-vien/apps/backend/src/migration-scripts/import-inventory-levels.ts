// Script dữ liệu chạy qua Medusa để chuẩn bị hoặc cập nhật import inventory levels.

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  updateInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"

type CsvRow = Record<string, string>

type VariantRecord = {
  id: string
  sku?: string | null
  inventory_items?: {
    inventory_item_id?: string | null
    id?: string | null
  }[]
}

type InventoryLevelRecord = {
  id: string
  inventory_item_id: string
  location_id: string
}

type StockLocationRecord = {
  id: string
  name?: string | null
}

const fileEnv = "INVENTORY_IMPORT_FILE"
const locationIdEnv = "INVENTORY_IMPORT_LOCATION_ID"
const locationNameEnv = "INVENTORY_IMPORT_LOCATION_NAME"

const quantityColumns = [
  "Inventory Quantity",
  "Variant Inventory Quantity",
  "Stocked Quantity",
  "stocked_quantity",
  "inventory_quantity",
]

export default async function import_inventory_levels({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const filePath = resolveCsvPath(logger)

  if (!filePath) {
    return
  }

  const rows = parseCsv(readFileSync(filePath, "utf8"))
  const inventoryRows = rows
    .map((row, index) => toInventoryRow(row, index + 2))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))

  if (!inventoryRows.length) {
    logger.warn(
      `No inventory rows found. Add one of these columns: ${quantityColumns.join(
        ", "
      )}`
    )
    return
  }

  const defaultLocationId = await resolveStockLocationId(query)
  const variantIds = unique(
    inventoryRows.map((row) => row.variantId).filter(Boolean) as string[]
  )
  const skus = unique(
    inventoryRows.map((row) => row.variantSku).filter(Boolean) as string[]
  )

  const variants = await loadVariants(query, variantIds, skus)
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]))
  const variantsBySku = new Map(
    variants
      .filter((variant) => variant.sku)
      .map((variant) => [variant.sku as string, variant])
  )

  const inventoryItemIds = unique(
    inventoryRows
      .map((row) => {
        const variant = row.variantId
          ? variantsById.get(row.variantId)
          : variantsBySku.get(row.variantSku ?? "")

        return getInventoryItemId(variant)
      })
      .filter(Boolean) as string[]
  )
  const locationIds = unique(
    inventoryRows.map((row) => row.locationId || defaultLocationId)
  )
  const levels = await loadInventoryLevels(query, inventoryItemIds, locationIds)
  const levelKeyMap = new Map(
    levels.map((level) => [
      getLevelKey(level.inventory_item_id, level.location_id),
      level,
    ])
  )

  const creates: {
    inventory_item_id: string
    location_id: string
    stocked_quantity: number
  }[] = []
  const updates: {
    id: string
    inventory_item_id: string
    location_id: string
    stocked_quantity: number
  }[] = []
  const skipped: string[] = []

  for (const row of inventoryRows) {
    const variant = row.variantId
      ? variantsById.get(row.variantId)
      : variantsBySku.get(row.variantSku ?? "")
    const inventoryItemId = getInventoryItemId(variant)
    const locationId = row.locationId || defaultLocationId

    if (!variant) {
      skipped.push(`line ${row.line}: variant not found`)
      continue
    }

    if (!inventoryItemId) {
      skipped.push(`line ${row.line}: variant has no inventory item`)
      continue
    }

    const existingLevel = levelKeyMap.get(getLevelKey(inventoryItemId, locationId))

    if (existingLevel) {
      updates.push({
        id: existingLevel.id,
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        stocked_quantity: row.quantity,
      })
    } else {
      creates.push({
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        stocked_quantity: row.quantity,
      })
    }
  }

  if (creates.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: creates,
      },
    })
  }

  if (updates.length) {
    await updateInventoryLevelsWorkflow(container).run({
      input: {
        updates,
      },
    })
  }

  logger.info(
    `Inventory import finished. Created ${creates.length}, updated ${updates.length}, skipped ${skipped.length}.`
  )

  for (const reason of skipped.slice(0, 20)) {
    logger.warn(reason)
  }
}

function resolveCsvPath(logger: { warn: (message: string) => void }): string | null {
  const rawPath = process.env[fileEnv]

  if (!rawPath) {
    logger.warn(
      `Skipping inventory import. Set ${fileEnv} to a CSV file path to run it.`
    )
    return null
  }

  const filePath = path.resolve(rawPath)

  if (!existsSync(filePath)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `CSV file not found: ${filePath}`
    )
  }

  return filePath
}

async function resolveStockLocationId(query: any): Promise<string> {
  if (process.env[locationIdEnv]) {
    return process.env[locationIdEnv] as string
  }

  const { data } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const locations = data as StockLocationRecord[]

  if (!locations.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No stock location found in Medusa."
    )
  }

  const locationName = process.env[locationNameEnv]

  if (locationName) {
    const location = locations.find(
      (item) => item.name?.toLowerCase() === locationName.toLowerCase()
    )

    if (!location) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Stock location not found: ${locationName}`
      )
    }

    return location.id
  }

  return locations[0].id
}

async function loadVariants(
  query: any,
  variantIds: string[],
  skus: string[]
): Promise<VariantRecord[]> {
  const variants: VariantRecord[] = []

  if (variantIds.length) {
    const { data } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "inventory_items.*"],
      filters: {
        id: variantIds,
      },
    })

    variants.push(...(data as VariantRecord[]))
  }

  if (skus.length) {
    const { data } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "inventory_items.*"],
      filters: {
        sku: skus,
      },
    })

    variants.push(...(data as VariantRecord[]))
  }

  return uniqueBy(variants, (variant) => variant.id)
}

async function loadInventoryLevels(
  query: any,
  inventoryItemIds: string[],
  locationIds: string[]
): Promise<InventoryLevelRecord[]> {
  if (!inventoryItemIds.length || !locationIds.length) {
    return []
  }

  const { data } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "inventory_item_id", "location_id"],
    filters: {
      inventory_item_id: inventoryItemIds,
      location_id: locationIds,
    },
  })

  return data as InventoryLevelRecord[]
}

function toInventoryRow(row: CsvRow, line: number) {
  const rawQuantity = getFirstValue(row, quantityColumns)

  if (!rawQuantity) {
    return null
  }

  const quantity = Number(rawQuantity)

  if (!Number.isInteger(quantity) || quantity < 0) {
    return null
  }

  const variantId = row["Variant Id"]?.trim()
  const variantSku = row["Variant SKU"]?.trim()

  if (!variantId && !variantSku) {
    return null
  }

  return {
    line,
    variantId,
    variantSku,
    quantity,
    locationId: row["Stock Location Id"]?.trim(),
  }
}

function getInventoryItemId(variant?: VariantRecord): string | null {
  const inventoryItem = variant?.inventory_items?.[0]

  return inventoryItem?.inventory_item_id ?? inventoryItem?.id ?? null
}

function getFirstValue(row: CsvRow, columns: string[]): string {
  for (const column of columns) {
    const value = row[column]?.trim()

    if (value) {
      return value
    }
  }

  return ""
}

function getLevelKey(inventoryItemId: string, locationId: string): string {
  return `${inventoryItemId}:${locationId}`
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()

  return items.filter((item) => {
    const key = getKey(item)

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function parseCsv(content: string): CsvRow[] {
  const rows = parseCsvRows(content.replace(/^\uFEFF/, ""))
  const [headers, ...records] = rows

  if (!headers?.length) {
    return []
  }

  return records
    .filter((record) => record.some((value) => value.trim()))
    .map((record) =>
      headers.reduce<CsvRow>((row, header, index) => {
        row[header.trim()] = record[index] ?? ""
        return row
      }, {})
    )
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ""
  let inQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const nextChar = content[index + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === "," && !inQuotes) {
      row.push(value)
      value = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1
      }

      row.push(value)
      rows.push(row)
      row = []
      value = ""
      continue
    }

    value += char
  }

  row.push(value)
  rows.push(row)

  return rows
}
