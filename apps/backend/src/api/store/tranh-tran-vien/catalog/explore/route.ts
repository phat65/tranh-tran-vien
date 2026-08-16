// API storefront cho Explore động từ taxonomy terms.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  EXPLORE_GROUP_DEFINITIONS,
  getPublicExploreTermSlug,
  resolveExploreNavigations,
} from "../../../../../lib/explore-navigation"
import { getTaxonomyService } from "../utils"

const exploreGroups = EXPLORE_GROUP_DEFINITIONS

type TaxonomyRecord = {
  id: string
  code: string
  name: string
  status: "draft" | "active" | "archived"
  sort_order: number
  metadata?: Record<string, unknown> | null
}

type TaxonomyTermRecord = {
  id: string
  taxonomy_id: string
  name: string
  slug: string
  image_url?: string | null
  description?: string | null
  status: "draft" | "active" | "archived"
  sort_order: number
  seo_title?: string | null
  seo_description?: string | null
  metadata?: Record<string, unknown> | null
}

type ProductTaxonomyTermRecord = {
  id: string
  product_id: string
  term_id: string
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const headingSlug =
    typeof req.query.heading_slug === "string"
      ? req.query.heading_slug
      : undefined
  const itemSlug =
    typeof req.query.item_slug === "string" ? req.query.item_slug : undefined
  const taxonomyService = getTaxonomyService(req.scope)
  const groups = await getExploreGroups(taxonomyService)

  if (headingSlug && itemSlug) {
    const group = groups.find((entry) => entry.slug === headingSlug)
    const item = group?.terms.find(
      (term) => getPublicExploreTermSlug(term) === itemSlug
    )

    if (!group || !item) {
      res.status(200).json({
        groups,
        group: null,
        item: null,
        product_ids: [],
      })
      return
    }

    const productLinks = (await taxonomyService.listProductTaxonomyTerms(
      { term_id: item.id },
      { take: 1000, order: { sort_order: "ASC", created_at: "DESC" } }
    )) as ProductTaxonomyTermRecord[]

    res.status(200).json({
      groups,
      group,
      item,
      product_ids: productLinks.map((link) => link.product_id),
    })
    return
  }

  res.status(200).json({ groups })
}

async function getExploreGroups(taxonomyService: any) {
  const taxonomies = (await taxonomyService.listTaxonomies(
    { status: "active" },
    { take: 500, order: { sort_order: "ASC", created_at: "DESC" } }
  )) as TaxonomyRecord[]
  const byCode = new Map(taxonomies.map((taxonomy) => [taxonomy.code, taxonomy]))
  const termsByTaxonomyId = new Map<string, TaxonomyTermRecord[]>()

  for (const group of exploreGroups) {
    const taxonomy = byCode.get(group.code)

    if (!taxonomy) {
      continue
    }

    const terms = (await taxonomyService.listTaxonomyTerms(
      { taxonomy_id: taxonomy.id, status: "active" },
      { take: 200, order: { sort_order: "ASC", created_at: "DESC" } }
    )) as TaxonomyTermRecord[]

    termsByTaxonomyId.set(taxonomy.id, terms)
  }

  const groups = exploreGroups.map((group) => {
    const taxonomy = byCode.get(group.code)

    return {
      code: group.code,
      label: group.label,
      slug: group.slug,
      sort_order: group.sort_order,
      taxonomy_id: taxonomy?.id ?? null,
      metadata: taxonomy?.metadata ?? null,
      terms: taxonomy ? termsByTaxonomyId.get(taxonomy.id) ?? [] : [],
    }
  })

  return resolveExploreNavigations(groups)
}
