// API admin xử lý dữ liệu quản trị cho tranh tran vien / catalog / navigation items / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  navigationItemUpdateBodySchema,
  NavigationItemUpdateBody,
} from "../../validators"
import { assertFound, getNavigationService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getNavigationService(req.scope)
  const navigation_item = await service.retrieveNavigationItem(req.params.id)

  res.status(200).json({
    navigation_item: assertFound(navigation_item, "Navigation item not found"),
  })
}

export async function POST(
  req: MedusaRequest<NavigationItemUpdateBody>,
  res: MedusaResponse
): Promise<void> {
  const input = navigationItemUpdateBodySchema.parse(req.body)
  const service = getNavigationService(req.scope)

  if (input.menu_id) {
    await service.retrieveNavigationMenu(input.menu_id)
  }

  const [navigation_item] = await service.updateNavigationItems({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({
    navigation_item: assertFound(navigation_item, "Navigation item not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getNavigationService(req.scope)
  await service.deleteNavigationItems(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "navigation_item",
    deleted: true,
  })
}
