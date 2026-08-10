// Script dữ liệu chạy qua Medusa để chuẩn bị hoặc cập nhật rename store vietnam.

import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type StoreRecord = {
  id: string
  name?: string | null
}

type SalesChannelRecord = {
  id: string
  name?: string | null
}

type StockLocationRecord = {
  id: string
  name?: string | null
}

const vietnamStoreName = "Tranh Tran Vien Vietnam"
const vietnamSalesChannelName = "Vietnam Sales Channel"
const vietnamWarehouseName = "Vietnam Warehouse"

export default async function rename_store_vietnam({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeModuleService = container.resolve(Modules.STORE) as any
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL) as any
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION) as any

  const stores = await loadStores(query)
  const store =
    stores.find((item) => item.name === vietnamStoreName) ??
    stores.find((item) => item.name === "Default Store") ??
    stores[0]

  if (store) {
    await storeModuleService.updateStores(store.id, {
      name: vietnamStoreName,
    })
    logger.info(`Store renamed to ${vietnamStoreName}`)
  } else {
    logger.warn("No store found to rename")
  }

  const salesChannels = await loadSalesChannels(query)
  const salesChannel =
    salesChannels.find((item) => item.name === vietnamSalesChannelName) ??
    salesChannels.find((item) => item.name === "Default Sales Channel") ??
    salesChannels[0]

  if (salesChannel) {
    await salesChannelModuleService.updateSalesChannels(salesChannel.id, {
      name: vietnamSalesChannelName,
      description: "Kenh ban hang Tranh Tran Vien Vietnam",
    })
    logger.info(`Sales channel renamed to ${vietnamSalesChannelName}`)
  } else {
    logger.warn("No sales channel found to rename")
  }

  const stockLocations = await loadStockLocations(query)
  const stockLocation =
    stockLocations.find((item) => item.name === vietnamWarehouseName) ??
    stockLocations.find((item) => item.name === "European Warehouse") ??
    stockLocations[0]

  if (stockLocation) {
    await stockLocationModuleService.updateStockLocations(stockLocation.id, {
      name: vietnamWarehouseName,
      address: {
        city: "Ho Chi Minh City",
        country_code: "VN",
        address_1: "",
      },
    })
    logger.info(`Stock location renamed to ${vietnamWarehouseName}`)
  } else {
    logger.warn("No stock location found to rename")
  }
}

async function loadStores(query: any): Promise<StoreRecord[]> {
  const { data } = await query.graph({
    entity: "store",
    fields: ["id", "name"],
  })

  return data as StoreRecord[]
}

async function loadSalesChannels(query: any): Promise<SalesChannelRecord[]> {
  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })

  return data as SalesChannelRecord[]
}

async function loadStockLocations(query: any): Promise<StockLocationRecord[]> {
  const { data } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })

  return data as StockLocationRecord[]
}
