import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getNavigationService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getNavigationService(req.scope)
  const [menus] = await service.listAndCountNavigationMenus(
    {
      code: req.params.code,
      status: "active",
    },
    { take: 1 }
  )
  const menu = menus[0] ?? null

  const navigation_items = menu
    ? await service.listNavigationItems(
        {
          menu_id: menu.id,
          visibility: "visible",
        },
        {
          take: 500,
          order: { sort_order: "ASC", created_at: "DESC" },
        }
      )
    : []

  res.status(200).json({
    navigation_menu: menu,
    navigation_items,
  })
}
