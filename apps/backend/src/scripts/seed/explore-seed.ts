import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type {
  CatalogExploreNavigationSeed,
  CatalogProductExploreSeed,
} from "../../data/catalog-seed-types"
import {
  EXPLORE_GROUP_DEFINITIONS,
  getPublicExploreTermSlug,
  withStoredExploreNavigation,
} from "../../lib/explore-navigation"
import { TAXONOMY_MODULE } from "../../modules/taxonomy"

type ProductRecord = {
  id: string
  handle?: string | null
}

type TaxonomyRecord = {
  id: string
  code: string
  name: string
  status: "draft" | "active" | "archived"
  sort_order?: number | null
  metadata?: Record<string, unknown> | null
}

type TaxonomyTermRecord = {
  id: string
  taxonomy_id: string
  name: string
  slug: string
  status: "draft" | "active" | "archived"
  sort_order?: number | null
  metadata?: Record<string, unknown> | null
}

type ProductTaxonomyTermRecord = {
  id: string
  product_id: string
  term_id: string
}

export async function seedProductExploreAssignments(
  container: MedusaContainer,
  exploreSeeds: CatalogProductExploreSeed[],
  products: ProductRecord[]
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const taxonomyService = container.resolve(TAXONOMY_MODULE) as any
  const productByHandle = new Map(
    products
      .filter((product) => product.handle)
      .map((product) => [product.handle as string, product])
  )

  for (const [index, seed] of exploreSeeds.entries()) {
    const taxonomy = await ensureExploreTaxonomy(taxonomyService, seed, index)
    const term = await ensureExploreTerm(taxonomyService, taxonomy, seed, index)
    const targetProducts = seed.productHandles
      .map((handle) => productByHandle.get(handle))
      .filter((product): product is ProductRecord => Boolean(product))

    if (!targetProducts.length) {
      logger.warn(`No products found for Explore item ${seed.itemName}.`)
      continue
    }

    await ensureExploreProductLinks(taxonomyService, term, targetProducts)
    logger.info(
      `Seeded Explore ${seed.headingLabel} / ${seed.itemName} for ${targetProducts.length} product(s).`
    )
  }
}

export async function seedExploreNavigation(
  container: MedusaContainer,
  navigationSeeds: CatalogExploreNavigationSeed[]
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const taxonomyService = container.resolve(TAXONOMY_MODULE) as any

  for (const seed of navigationSeeds) {
    const sourceTaxonomies = (await taxonomyService.listTaxonomies({
      code: seed.sourceHeadingCode,
    })) as TaxonomyRecord[]
    const targetTaxonomies = (await taxonomyService.listTaxonomies({
      code: seed.targetHeadingCode,
    })) as TaxonomyRecord[]
    const sourceTaxonomy = sourceTaxonomies[0]
    const targetTaxonomy = targetTaxonomies[0]

    if (!sourceTaxonomy || !targetTaxonomy) {
      logger.warn(
        `Could not seed Explore navigation ${seed.sourceHeadingCode}: heading not found.`
      )
      continue
    }

    const targetTerms = (await taxonomyService.listTaxonomyTerms({
      taxonomy_id: targetTaxonomy.id,
    })) as TaxonomyTermRecord[]
    const targetTerm = targetTerms.find(
      (term) => getPublicExploreTermSlug(term) === seed.targetItemSlug
    )

    if (!targetTerm) {
      logger.warn(
        `Could not seed Explore navigation ${seed.sourceHeadingCode}: destination item ${seed.targetItemSlug} not found.`
      )
      continue
    }

    await taxonomyService.updateTaxonomies({
      selector: { id: sourceTaxonomy.id },
      data: {
        metadata: withStoredExploreNavigation(sourceTaxonomy.metadata, {
          mode: "filter_tabs",
          target_term_id: targetTerm.id,
          auto_assign_target: seed.autoAssignTarget,
        }),
      },
    })

    logger.info(
      `Seeded Explore navigation ${seed.sourceHeadingCode} -> ${seed.targetHeadingCode}/${seed.targetItemSlug}.`
    )
  }
}

async function ensureExploreTaxonomy(
  taxonomyService: any,
  seed: CatalogProductExploreSeed,
  index: number
): Promise<TaxonomyRecord> {
  const existing = (await taxonomyService.listTaxonomies({
    code: seed.headingCode,
  })) as TaxonomyRecord[]
  const current = existing[0]
  const data = {
    code: seed.headingCode,
    name: seed.headingLabel,
    description: null,
    status: "active" as const,
    sort_order: getHeadingSortOrder(seed.headingCode, index),
    metadata: {
      ...(current?.metadata ?? {}),
      explore: true,
      locked: true,
      slug: seed.headingSlug,
    },
  }

  if (!current) {
    return (await taxonomyService.createTaxonomies(data)) as TaxonomyRecord
  }

  const [updated] = (await taxonomyService.updateTaxonomies({
    selector: { id: current.id },
    data,
  })) as TaxonomyRecord[]

  return updated ?? current
}

async function ensureExploreTerm(
  taxonomyService: any,
  taxonomy: TaxonomyRecord,
  seed: CatalogProductExploreSeed,
  index: number
): Promise<TaxonomyTermRecord> {
  const existing = (await taxonomyService.listTaxonomyTerms({
    slug: seed.itemSlug,
  })) as TaxonomyTermRecord[]
  const current = existing[0]
  const data = {
    taxonomy_id: taxonomy.id,
    parent_id: null,
    name: seed.itemName,
    slug: seed.itemSlug,
    image_url: null,
    description: null,
    status: "active" as const,
    sort_order: index * 10,
    seo_title: null,
    seo_description: null,
    metadata: {
      ...(current?.metadata ?? {}),
      slug: seed.itemSlug,
    },
  }

  if (!current) {
    return (await taxonomyService.createTaxonomyTerms(data)) as TaxonomyTermRecord
  }

  const [updated] = (await taxonomyService.updateTaxonomyTerms({
    selector: { id: current.id },
    data,
  })) as TaxonomyTermRecord[]

  return updated ?? current
}

async function ensureExploreProductLinks(
  taxonomyService: any,
  term: TaxonomyTermRecord,
  products: ProductRecord[]
) {
  const productIds = products.map((product) => product.id)
  const existingLinks = (await taxonomyService.listProductTaxonomyTerms({
    product_id: productIds,
  })) as ProductTaxonomyTermRecord[]
  const linkedProductIds = new Set(
    existingLinks
      .filter((link) => link.term_id === term.id)
      .map((link) => link.product_id)
  )
  const linksToCreate = products
    .filter((product) => !linkedProductIds.has(product.id))
    .map((product, index) => ({
      product_id: product.id,
      term_id: term.id,
      sort_order: index,
      metadata: { source: "seed" },
    }))

  if (linksToCreate.length) {
    await taxonomyService.createProductTaxonomyTerms(linksToCreate)
  }
}

function getHeadingSortOrder(headingCode: string, fallbackIndex: number) {
  const definition = EXPLORE_GROUP_DEFINITIONS.find(
    (group) => group.code === headingCode
  )

  return definition?.sort_order ?? fallbackIndex * 10
}
