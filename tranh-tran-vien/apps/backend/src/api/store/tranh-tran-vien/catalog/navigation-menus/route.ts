// API storefront cung cấp dữ liệu public cho tranh tran vien / catalog / navigation menus.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getNavigationService,
  parseStoreCatalogListQuery,
  toStoreCreatedAtListConfig,
} from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseStoreCatalogListQuery(req.query)
  const service = getNavigationService(req.scope)
  const [navigation_menus, count] =
    await service.listAndCountNavigationMenus(
      { status: "active" },
      toStoreCreatedAtListConfig(query)
    )

  res.status(200).json({
    navigation_menus,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}
