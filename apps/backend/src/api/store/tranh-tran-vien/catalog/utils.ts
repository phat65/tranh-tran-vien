// Helper dùng chung cho nhóm API store / tranh tran vien / catalog.

import { MedusaContainer } from "@medusajs/framework/types"
import { z } from "@medusajs/framework/zod"

import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"
import { NAVIGATION_MODULE } from "../../../../modules/navigation"
import NavigationModuleService from "../../../../modules/navigation/service"
import { SITE_SETTING_MODULE } from "../../../../modules/site-setting"
import SiteSettingModuleService from "../../../../modules/site-setting/service"
import { TAXONOMY_MODULE } from "../../../../modules/taxonomy"
import TaxonomyModuleService from "../../../../modules/taxonomy/service"

export const storeCatalogListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().optional(),
  taxonomy_id: z.string().trim().optional(),
  menu_id: z.string().trim().optional(),
})

export type StoreCatalogListQuery = z.infer<typeof storeCatalogListQuerySchema>

export type ListConfig = {
  skip: number
  take: number
  order?: Record<string, "ASC" | "DESC">
}

export function parseStoreCatalogListQuery(
  query: unknown
): StoreCatalogListQuery {
  return storeCatalogListQuerySchema.parse(query)
}

export function toStoreListConfig(query: StoreCatalogListQuery): ListConfig {
  return {
    skip: query.offset,
    take: query.limit,
    order: {
      sort_order: "ASC",
      created_at: "DESC",
    },
  }
}

export function toStoreCreatedAtListConfig(
  query: StoreCatalogListQuery
): ListConfig {
  return {
    skip: query.offset,
    take: query.limit,
    order: {
      created_at: "DESC",
    },
  }
}

export function getBrandService(scope: MedusaContainer): BrandModuleService {
  return scope.resolve(BRAND_MODULE)
}

export function getTaxonomyService(
  scope: MedusaContainer
): TaxonomyModuleService {
  return scope.resolve(TAXONOMY_MODULE)
}

export function getNavigationService(
  scope: MedusaContainer
): NavigationModuleService {
  return scope.resolve(NAVIGATION_MODULE)
}

export function getSiteSettingService(
  scope: MedusaContainer
): SiteSettingModuleService {
  return scope.resolve(SITE_SETTING_MODULE)
}
