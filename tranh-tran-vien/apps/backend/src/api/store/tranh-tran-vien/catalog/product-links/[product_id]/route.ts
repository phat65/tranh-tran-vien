import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getBrandService, getTaxonomyService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.product_id
  const brandService = getBrandService(req.scope)
  const taxonomyService = getTaxonomyService(req.scope)

  const [product_brands, product_taxonomy_terms] = await Promise.all([
    brandService.listProductBrands({ product_id: productId }),
    taxonomyService.listProductTaxonomyTerms({ product_id: productId }),
  ])

  const brandIds = product_brands.map((item) => item.brand_id)
  const termIds = product_taxonomy_terms.map((item) => item.term_id)

  const [brands, taxonomy_terms] = await Promise.all([
    brandIds.length
      ? brandService.listBrands({ id: brandIds, status: "active" })
      : [],
    termIds.length
      ? taxonomyService.listTaxonomyTerms({ id: termIds, status: "active" })
      : [],
  ])

  res.status(200).json({
    product_id: productId,
    product_brands,
    product_taxonomy_terms,
    brands,
    taxonomy_terms,
  })
}
