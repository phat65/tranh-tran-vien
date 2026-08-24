import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  deleteInventoryItemWorkflow,
  deleteReservationsWorkflow,
} from "@medusajs/medusa/core-flows"

type InventoryItemRecord = {
  id: string
  sku?: string | null
  title?: string | null
}

type ReservationItemRecord = {
  id: string
}

const PAGE_SIZE = 100
const DELETE_BATCH_SIZE = 20

export default async function clear_inventory({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const inventoryItems: InventoryItemRecord[] = []
  const reservationItems: ReservationItemRecord[] = []
  let offset = 0

  while (true) {
    const { data } = await query.graph({
      entity: "reservation_item",
      fields: ["id"],
      pagination: {
        skip: offset,
        take: PAGE_SIZE,
      },
    })

    const page = data as ReservationItemRecord[]
    reservationItems.push(...page)

    if (page.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE
  }

  if (reservationItems.length) {
    logger.info(`Deleting ${reservationItems.length} reservation item(s)...`)
    console.log(`deleting_reservation_items=${reservationItems.length}`)
    await deleteReservationsWorkflow(container).run({
      input: {
        ids: reservationItems.map((item) => item.id),
      },
    })
  }

  offset = 0

  while (true) {
    const { data } = await query.graph({
      entity: "inventory_item",
      fields: ["id", "sku", "title"],
      pagination: {
        skip: offset,
        take: PAGE_SIZE,
      },
    })

    const page = data as InventoryItemRecord[]
    inventoryItems.push(...page)

    if (page.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE
  }

  if (!inventoryItems.length) {
    logger.info("No inventory items found to delete.")
    console.log("active_inventory_items=0")
    return
  }

  logger.info(`Deleting ${inventoryItems.length} inventory item(s)...`)
  console.log(`deleting_inventory_items=${inventoryItems.length}`)

  for (let index = 0; index < inventoryItems.length; index += DELETE_BATCH_SIZE) {
    const batch = inventoryItems.slice(index, index + DELETE_BATCH_SIZE)
    await deleteInventoryItemWorkflow(container).run({
      input: batch.map((item) => item.id),
    })
  }

  logger.info(`Deleted ${inventoryItems.length} inventory item(s).`)
  console.log(`deleted_inventory_items=${inventoryItems.length}`)
}
