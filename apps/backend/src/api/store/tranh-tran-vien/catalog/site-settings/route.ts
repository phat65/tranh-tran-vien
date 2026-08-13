// API storefront cung cấp dữ liệu public cho tranh tran vien / catalog / site settings.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getSiteSettingService,
  parseStoreCatalogListQuery,
  toStoreCreatedAtListConfig,
} from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseStoreCatalogListQuery(req.query)
  const filters: Record<string, unknown> = { is_public: true }

  if (query.q) {
    filters.key = { $ilike: `%${query.q}%` }
  }

  const service = getSiteSettingService(req.scope)
  const [site_settings, count] = await service.listAndCountSiteSettings(
    filters,
    toStoreCreatedAtListConfig(query)
  )

  res.status(200).json({
    site_settings,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}
