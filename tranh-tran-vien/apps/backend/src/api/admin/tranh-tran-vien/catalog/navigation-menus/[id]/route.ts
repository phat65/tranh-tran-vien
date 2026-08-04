import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  navigationMenuUpdateBodySchema,
  NavigationMenuUpdateBody,
} from "../../validators"
import { assertFound, getNavigationService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getNavigationService(req.scope)
  const navigation_menu = await service.retrieveNavigationMenu(req.params.id)

  res.status(200).json({
    navigation_menu: assertFound(navigation_menu, "Navigation menu not found"),
  })
}

export async function POST(
  req: MedusaRequest<NavigationMenuUpdateBody>,
  res: MedusaResponse
): Promise<void> {
  const input = navigationMenuUpdateBodySchema.parse(req.body)
  const service = getNavigationService(req.scope)
  const [navigation_menu] = await service.updateNavigationMenus({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({
    navigation_menu: assertFound(navigation_menu, "Navigation menu not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getNavigationService(req.scope)
  await service.deleteNavigationMenus(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "navigation_menu",
    deleted: true,
  })
}
