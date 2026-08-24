// API admin xử lý dữ liệu quản trị cho tranh tran vien / catalog / site settings / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  siteSettingUpdateBodySchema,
  SiteSettingUpdateBody,
} from "../../validators"
import { assertFound, getSiteSettingService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getSiteSettingService(req.scope)
  const site_setting = await service.retrieveSiteSetting(req.params.id)

  res.status(200).json({
    site_setting: assertFound(site_setting, "Site setting not found"),
  })
}

export async function POST(
  req: MedusaRequest<SiteSettingUpdateBody>,
  res: MedusaResponse
): Promise<void> {
  const input = siteSettingUpdateBodySchema.parse(req.body)
  const service = getSiteSettingService(req.scope)
  const [site_setting] = await service.updateSiteSettings({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({
    site_setting: assertFound(site_setting, "Site setting not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getSiteSettingService(req.scope)
  await service.deleteSiteSettings(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "site_setting",
    deleted: true,
  })
}
