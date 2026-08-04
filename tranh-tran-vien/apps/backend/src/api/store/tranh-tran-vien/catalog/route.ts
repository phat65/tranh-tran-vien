import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getBrandService,
  getNavigationService,
  getSiteSettingService,
  getTaxonomyService,
} from "./utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const brandService = getBrandService(req.scope)
  const taxonomyService = getTaxonomyService(req.scope)
  const navigationService = getNavigationService(req.scope)
  const siteSettingService = getSiteSettingService(req.scope)

  const [
    brands,
    taxonomies,
    taxonomy_terms,
    navigation_menus,
    navigation_items,
    site_settings,
  ] = await Promise.all([
    brandService.listBrands(
      { status: "active" },
      { take: 200, order: { sort_order: "ASC", created_at: "DESC" } }
    ),
    taxonomyService.listTaxonomies(
      { status: "active" },
      { take: 200, order: { sort_order: "ASC", created_at: "DESC" } }
    ),
    taxonomyService.listTaxonomyTerms(
      { status: "active" },
      { take: 200, order: { sort_order: "ASC", created_at: "DESC" } }
    ),
    navigationService.listNavigationMenus(
      { status: "active" },
      { take: 200, order: { created_at: "DESC" } }
    ),
    navigationService.listNavigationItems(
      { visibility: "visible" },
      { take: 500, order: { sort_order: "ASC", created_at: "DESC" } }
    ),
    siteSettingService.listSiteSettings(
      { is_public: true },
      { take: 200, order: { created_at: "DESC" } }
    ),
  ])

  res.status(200).json({
    brands,
    taxonomies,
    taxonomy_terms,
    navigation_menus,
    navigation_items,
    site_settings,
  })
}
