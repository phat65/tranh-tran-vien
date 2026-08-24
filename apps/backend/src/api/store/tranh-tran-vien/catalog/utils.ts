// Helper dùng chung cho nhóm API store / tranh tran vien / catalog.

import { MedusaContainer } from "@medusajs/framework/types"
import { z } from "@medusajs/framework/zod"

import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"
import { SITE_SETTING_MODULE } from "../../../../modules/site-setting"
import SiteSettingModuleService from "../../../../modules/site-setting/service"

export const storeCatalogListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().optional(),
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

export function getSiteSettingService(
  scope: MedusaContainer
): SiteSettingModuleService {
  return scope.resolve(SITE_SETTING_MODULE)
}
