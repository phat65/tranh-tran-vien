// API admin xử lý dữ liệu quản trị cho tranh tran vien / catalog / taxonomy terms / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  EXPLORE_GROUP_DEFINITIONS,
  readStoredExploreNavigation,
} from "../../../../../../lib/explore-navigation"
import {
  taxonomyTermUpdateBodySchema,
  TaxonomyTermUpdateBody,
} from "../../validators"
import { assertFound, getTaxonomyService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getTaxonomyService(req.scope)
  const taxonomy_term = await service.retrieveTaxonomyTerm(req.params.id)

  res.status(200).json({
    taxonomy_term: assertFound(taxonomy_term, "Taxonomy term not found"),
  })
}

export async function POST(
  req: MedusaRequest<TaxonomyTermUpdateBody>,
  res: MedusaResponse
): Promise<void> {
  const input = taxonomyTermUpdateBodySchema.parse(req.body)
  const service = getTaxonomyService(req.scope)

  if (input.taxonomy_id) {
    await service.retrieveTaxonomy(input.taxonomy_id)
  }

  const [taxonomy_term] = await service.updateTaxonomyTerms({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({
    taxonomy_term: assertFound(taxonomy_term, "Taxonomy term not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getTaxonomyService(req.scope)
  const exploreCodes = new Set<string>(
    EXPLORE_GROUP_DEFINITIONS.map((group) => group.code)
  )
  const taxonomies = (await service.listTaxonomies(
    {},
    { take: 500 }
  )) as Array<{
    code: string
    name: string
    metadata?: Record<string, unknown> | null
  }>
  const references = taxonomies.filter((taxonomy) => {
    if (!exploreCodes.has(taxonomy.code)) {
      return false
    }

    const navigation = readStoredExploreNavigation(taxonomy.metadata)

    return (
      navigation.mode === "filter_tabs" &&
      navigation.target_term_id === req.params.id
    )
  })

  if (references.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `This Explore item is used as a destination by ${references
        .map((taxonomy) => taxonomy.name)
        .join(", ")}. Change those heading settings before deleting it.`
    )
  }

  await service.deleteTaxonomyTerms(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "taxonomy_term",
    deleted: true,
  })
}
