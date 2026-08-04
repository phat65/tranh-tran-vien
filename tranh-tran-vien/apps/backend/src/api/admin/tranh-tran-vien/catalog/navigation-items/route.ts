import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  navigationItemBodySchema,
  NavigationItemBody,
} from "../validators"
import { getNavigationService, parseListQuery, toListConfig } from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseListQuery(req.query)
  const filters: Record<string, unknown> = {}

  if (query.q) {
    filters.label = { $ilike: `%${query.q}%` }
  }

  const menuId = typeof req.query.menu_id === "string" ? req.query.menu_id : ""
  if (menuId) {
    filters.menu_id = menuId
  }

  const service = getNavigationService(req.scope)
  const [navigation_items, count] =
    await service.listAndCountNavigationItems(filters, toListConfig(query))

  res.status(200).json({
    navigation_items,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<NavigationItemBody>,
  res: MedusaResponse
): Promise<void> {
  const input = navigationItemBodySchema.parse(req.body)
  const service = getNavigationService(req.scope)
  await service.retrieveNavigationMenu(input.menu_id)
  const navigation_item = await service.createNavigationItems(input)

  res.status(200).json({ navigation_item })
}
