import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  taxonomyUpdateBodySchema,
  TaxonomyUpdateBody,
} from "../../validators"
import { assertFound, getTaxonomyService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getTaxonomyService(req.scope)
  const taxonomy = await service.retrieveTaxonomy(req.params.id)

  res.status(200).json({
    taxonomy: assertFound(taxonomy, "Taxonomy not found"),
  })
}

export async function POST(
  req: MedusaRequest<TaxonomyUpdateBody>,
  res: MedusaResponse
): Promise<void> {
  const input = taxonomyUpdateBodySchema.parse(req.body)
  const service = getTaxonomyService(req.scope)
  const [taxonomy] = await service.updateTaxonomies({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({
    taxonomy: assertFound(taxonomy, "Taxonomy not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getTaxonomyService(req.scope)
  await service.deleteTaxonomies(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "taxonomy",
    deleted: true,
  })
}
