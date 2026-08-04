import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

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
  await service.deleteTaxonomyTerms(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "taxonomy_term",
    deleted: true,
  })
}
