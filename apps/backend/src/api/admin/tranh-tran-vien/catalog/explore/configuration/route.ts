import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import {
  EXPLORE_GROUP_DEFINITIONS,
  StoredExploreNavigation,
  getMissingExploreDestinationProductIds,
  getExploreNavigationValidationError,
  getPublicExploreTermSlug,
  withStoredExploreNavigation,
} from "../../../../../../lib/explore-navigation"
import { getTaxonomyService } from "../../utils"

const navigationBodySchema = z.discriminatedUnion("mode", [
  z
    .object({
      source_heading_code: z.string().trim().min(1),
      mode: z.literal("standalone"),
    })
    .strict(),
  z
    .object({
      source_heading_code: z.string().trim().min(1),
      mode: z.literal("filter_tabs"),
      target_term_id: z.string().trim().min(1),
      auto_assign_target: z.boolean().default(true),
    })
    .strict(),
])

type TaxonomyRecord = {
  id: string
  code: string
  name: string
  metadata?: Record<string, unknown> | null
}

type TaxonomyTermRecord = {
  id: string
  taxonomy_id: string
  name: string
  slug: string
  status: "draft" | "active" | "archived"
  metadata?: Record<string, unknown> | null
}

type ProductTaxonomyTermRecord = {
  id: string
  product_id: string
  term_id: string
}

type LoadedExploreGroup = {
  code: string
  label: string
  slug: string
  sort_order: number
  taxonomy_id: string | null
  metadata: Record<string, unknown> | null
  terms: TaxonomyTermRecord[]
}

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const input = navigationBodySchema.parse(req.body)
  const taxonomyService = getTaxonomyService(req.scope)
  const groups = await loadExploreGroups(taxonomyService)
  const sourceGroup = groups.find(
    (group) => group.code === input.source_heading_code
  )

  if (!sourceGroup?.taxonomy_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Explore heading not found: ${input.source_heading_code}`
    )
  }

  let navigation: StoredExploreNavigation = { mode: "standalone" }
  let target: ReturnType<typeof findTerm> = null

  if (input.mode === "filter_tabs") {
    const validationError = getExploreNavigationValidationError({
      sourceGroup,
      targetTermId: input.target_term_id,
      groups,
    })

    if (validationError) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        validationError
      )
    }

    target = findTerm(groups, input.target_term_id)
    navigation = {
      mode: "filter_tabs",
      target_term_id: input.target_term_id,
      auto_assign_target: input.auto_assign_target,
    }
  }

  await taxonomyService.updateTaxonomies({
    selector: { id: sourceGroup.taxonomy_id },
    data: {
      metadata: withStoredExploreNavigation(
        sourceGroup.metadata,
        navigation
      ),
    },
  })

  const backfilledProductCount =
    navigation.mode === "filter_tabs" &&
    navigation.auto_assign_target &&
    target
      ? await backfillDestinationAssignments(
          taxonomyService,
          sourceGroup.terms,
          target.term.id
        )
      : 0

  res.status(200).json({
    source_heading_code: sourceGroup.code,
    navigation:
      navigation.mode === "filter_tabs"
        ? {
            mode: navigation.mode,
            auto_assign_target: navigation.auto_assign_target,
            target: target
              ? {
                  heading_code: target.group.code,
                  heading_label: target.group.label,
                  heading_slug: target.group.slug,
                  term_id: target.term.id,
                  term_name: target.term.name,
                  term_slug: getPublicExploreTermSlug(target.term),
                }
              : null,
          }
        : {
            mode: "standalone",
            auto_assign_target: false,
            target: null,
          },
    backfilled_product_count: backfilledProductCount,
  })
}

async function loadExploreGroups(taxonomyService: any) {
  const taxonomies = (await taxonomyService.listTaxonomies(
    {},
    { take: 500 }
  )) as TaxonomyRecord[]
  const taxonomyByCode = new Map(
    taxonomies.map((taxonomy) => [taxonomy.code, taxonomy])
  )
  const groups: LoadedExploreGroup[] = []

  for (const definition of EXPLORE_GROUP_DEFINITIONS) {
    const taxonomy = taxonomyByCode.get(definition.code)
    const terms = taxonomy
      ? ((await taxonomyService.listTaxonomyTerms(
          { taxonomy_id: taxonomy.id },
          { take: 500, order: { sort_order: "ASC" } }
        )) as TaxonomyTermRecord[])
      : []

    groups.push({
      ...definition,
      taxonomy_id: taxonomy?.id ?? null,
      metadata: taxonomy?.metadata ?? null,
      terms,
    })
  }

  return groups
}

function findTerm(
  groups: LoadedExploreGroup[],
  termId: string
) {
  for (const group of groups) {
    const term = group.terms.find((candidate) => candidate.id === termId)

    if (term) {
      return { group, term }
    }
  }

  return null
}

async function backfillDestinationAssignments(
  taxonomyService: any,
  sourceTerms: TaxonomyTermRecord[],
  targetTermId: string
) {
  const sourceTermIds = sourceTerms
    .filter((term) => term.status === "active")
    .map((term) => term.id)

  if (!sourceTermIds.length) {
    return 0
  }

  const sourceLinks = await listAllProductTaxonomyTerms(taxonomyService, {
    term_id: sourceTermIds,
  })
  const sourceProductIds = Array.from(
    new Set(sourceLinks.map((link) => link.product_id))
  )

  if (!sourceProductIds.length) {
    return 0
  }

  const targetLinks = await listAllProductTaxonomyTerms(taxonomyService, {
    term_id: targetTermId,
  })
  const productIdsToLink = getMissingExploreDestinationProductIds(
    sourceProductIds,
    targetLinks.map((link) => link.product_id)
  )

  for (let index = 0; index < productIdsToLink.length; index += 200) {
    await taxonomyService.createProductTaxonomyTerms(
      productIdsToLink.slice(index, index + 200).map((productId) => ({
        product_id: productId,
        term_id: targetTermId,
        sort_order: 0,
        metadata: {
          source: "explore-navigation-backfill",
        },
      }))
    )
  }

  return productIdsToLink.length
}

async function listAllProductTaxonomyTerms(
  taxonomyService: any,
  filters: Record<string, string | string[]>
) {
  const links: ProductTaxonomyTermRecord[] = []
  const take = 500
  let skip = 0

  while (true) {
    const page = (await taxonomyService.listProductTaxonomyTerms(filters, {
      skip,
      take,
    })) as ProductTaxonomyTermRecord[]

    links.push(...page)

    if (page.length < take) {
      break
    }

    skip += take
  }

  return links
}
