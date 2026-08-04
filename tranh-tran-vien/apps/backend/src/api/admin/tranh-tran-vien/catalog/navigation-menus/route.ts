import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  navigationMenuBodySchema,
  NavigationMenuBody,
} from "../validators"
import {
  getNavigationService,
  parseListQuery,
  toCreatedAtListConfig,
} from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseListQuery(req.query)
  const filters: Record<string, unknown> = {}

  if (query.status) {
    filters.status = query.status
  }

  if (query.q) {
    filters.name = { $ilike: `%${query.q}%` }
  }

  const service = getNavigationService(req.scope)
  const [navigation_menus, count] =
    await service.listAndCountNavigationMenus(
      filters,
      toCreatedAtListConfig(query)
    )

  res.status(200).json({
    navigation_menus,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<NavigationMenuBody>,
  res: MedusaResponse
): Promise<void> {
  const input = navigationMenuBodySchema.parse(req.body)
  const service = getNavigationService(req.scope)
  const navigation_menu = await service.createNavigationMenus(input)

  res.status(200).json({ navigation_menu })
}
