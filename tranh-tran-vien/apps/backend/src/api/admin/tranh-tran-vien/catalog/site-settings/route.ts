import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  siteSettingBodySchema,
  SiteSettingBody,
} from "../validators"
import {
  getSiteSettingService,
  parseListQuery,
  toCreatedAtListConfig,
} from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseListQuery(req.query)
  const filters: Record<string, unknown> = {}

  if (query.q) {
    filters.key = { $ilike: `%${query.q}%` }
  }

  if (typeof query.is_public === "boolean") {
    filters.is_public = query.is_public
  }

  const service = getSiteSettingService(req.scope)
  const [site_settings, count] = await service.listAndCountSiteSettings(
    filters,
    toCreatedAtListConfig(query)
  )

  res.status(200).json({
    site_settings,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<SiteSettingBody>,
  res: MedusaResponse
): Promise<void> {
  const input = siteSettingBodySchema.parse(req.body)
  const service = getSiteSettingService(req.scope)
  const site_setting = await service.createSiteSettings(input)

  res.status(200).json({ site_setting })
}
