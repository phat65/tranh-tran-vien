// Helper dùng chung cho nhóm API admin / tranh tran vien / catalog.

import { refetchEntity } from "@medusajs/framework/http"
import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"
import { TAXONOMY_MODULE } from "../../../../modules/taxonomy"
import TaxonomyModuleService from "../../../../modules/taxonomy/service"
import { NAVIGATION_MODULE } from "../../../../modules/navigation"
import NavigationModuleService from "../../../../modules/navigation/service"
import { SITE_SETTING_MODULE } from "../../../../modules/site-setting"
import SiteSettingModuleService from "../../../../modules/site-setting/service"
import { ListQuery, listQuerySchema } from "./validators"

export type ListConfig = {
  skip: number
  take: number
  order?: Record<string, "ASC" | "DESC">
}

export function parseListQuery(query: unknown): ListQuery {
  return listQuerySchema.parse(query)
}

export function toListConfig(query: ListQuery): ListConfig {
  return {
    skip: query.offset,
    take: query.limit,
    order: {
      sort_order: "ASC",
      created_at: "DESC",
    },
  }
}

export function toCreatedAtListConfig(query: ListQuery): ListConfig {
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

export async function assertProductExists(
  scope: MedusaContainer,
  productId: string
): Promise<void> {
  const product = await refetchEntity({
    entity: "product",
    idOrFilter: productId,
    scope,
    fields: ["id"],
  })

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" not found`
    )
  }
}

export function assertFound<T>(value: T | null | undefined, message: string): T {
  if (!value) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, message)
  }

  return value
}

export function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

export async function assertAllIdsExist<T extends { id: string }>(
  ids: string[],
  records: T[],
  entityLabel: string
): Promise<void> {
  const foundIds = new Set(records.map((record) => record.id))
  const missing = ids.filter((id) => !foundIds.has(id))

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${entityLabel} not found: ${missing.join(", ")}`
    )
  }
}
