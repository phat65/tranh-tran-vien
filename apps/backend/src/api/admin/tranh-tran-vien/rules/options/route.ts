// API admin xử lý dữ liệu quản trị cho tranh tran vien / rules / options.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaContainer } from "@medusajs/framework/types"

import {
  EXPLORE_GROUP_DEFINITIONS,
  getPublicExploreTermSlug,
} from "../../../../../lib/explore-navigation"
import { getTaxonomyService } from "../../catalog/utils"
import { safeGraph } from "../utils"

type Option = {
  id: string
  label: string
  subtitle?: string
  image_url?: string | null
}

type TaxonomyRecord = {
  id: string
  code: string
  status: "draft" | "active" | "archived"
}

type TaxonomyTermRecord = {
  id: string
  taxonomy_id: string
  name: string
  slug: string
  status: "draft" | "active" | "archived"
  sort_order: number
  metadata?: Record<string, unknown> | null
}

type SalesChannelRecord = {
  id?: string
  name?: string
  description?: string | null
}

type RegionRecord = {
  id?: string
  name?: string
  currency_code?: string
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const [exploreItems, salesChannels, regions] = await Promise.all([
    getExploreItemOptions(req.scope),
    getSalesChannelOptions(req.scope),
    getRegionOptions(req.scope),
  ])

  res.status(200).json({
    explore_items: exploreItems,
    sales_channels: salesChannels,
    regions,
  })
}

async function getExploreItemOptions(
  scope: MedusaContainer
): Promise<Option[]> {
  const service = getTaxonomyService(scope)
  const taxonomies = (await service.listTaxonomies(
    { status: "active" },
    { take: 500 }
  )) as TaxonomyRecord[]
  const taxonomyByCode = new Map(
    taxonomies.map((taxonomy) => [taxonomy.code, taxonomy])
  )
  const options: Option[] = []

  for (const group of EXPLORE_GROUP_DEFINITIONS) {
    const taxonomy = taxonomyByCode.get(group.code)

    if (!taxonomy) {
      continue
    }

    const terms = (await service.listTaxonomyTerms(
      { taxonomy_id: taxonomy.id, status: "active" },
      { take: 500, order: { sort_order: "ASC", created_at: "ASC" } }
    )) as TaxonomyTermRecord[]

    options.push(
      ...terms.map((term) => ({
        id: term.id,
        label: term.name,
        subtitle: `${group.label} / ${getPublicExploreTermSlug(term)}`,
      }))
    )
  }

  return options
}

async function getSalesChannelOptions(
  scope: MedusaContainer
): Promise<Option[]> {
  const salesChannels = await safeGraph<SalesChannelRecord>(
    scope,
    "sales_channel",
    ["id", "name", "description"]
  )

  return salesChannels.map((channel) => ({
    id: channel.id ?? "",
    label: channel.name ?? channel.id ?? "",
    subtitle: channel.description ?? undefined,
  }))
}

async function getRegionOptions(scope: MedusaContainer): Promise<Option[]> {
  const regions = await safeGraph<RegionRecord>(scope, "region", [
    "id",
    "name",
    "currency_code",
  ])

  return regions.map((region) => ({
    id: region.id ?? "",
    label: region.name ?? region.id ?? "",
    subtitle: region.currency_code?.toUpperCase(),
  }))
}
