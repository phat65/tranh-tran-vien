import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  productCatalogLinksBodySchema,
  ProductCatalogLinksBody,
} from "../../validators"
import {
  assertAllIdsExist,
  assertProductExists,
  getBrandService,
  getTaxonomyService,
  unique,
} from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.product_id
  await assertProductExists(req.scope, productId)

  const brandService = getBrandService(req.scope)
  const taxonomyService = getTaxonomyService(req.scope)

  const product_brands = await brandService.listProductBrands({
    product_id: productId,
  })
  const product_taxonomy_terms =
    await taxonomyService.listProductTaxonomyTerms({
      product_id: productId,
    })

  const brandIds = product_brands.map((item) => item.brand_id)
  const taxonomyTermIds = product_taxonomy_terms.map((item) => item.term_id)

  const brands = brandIds.length
    ? await brandService.listBrands({ id: brandIds })
    : []
  const taxonomy_terms = taxonomyTermIds.length
    ? await taxonomyService.listTaxonomyTerms({ id: taxonomyTermIds })
    : []

  res.status(200).json({
    product_id: productId,
    product_brands,
    product_taxonomy_terms,
    brands,
    taxonomy_terms,
  })
}

export async function POST(
  req: MedusaRequest<ProductCatalogLinksBody>,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.product_id
  const input = productCatalogLinksBodySchema.parse(req.body)
  const brandIds = unique(input.brand_ids)
  const taxonomyTermIds = unique(input.taxonomy_term_ids)

  if (input.primary_brand_id && !brandIds.includes(input.primary_brand_id)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "primary_brand_id must be included in brand_ids"
    )
  }

  await assertProductExists(req.scope, productId)

  const brandService = getBrandService(req.scope)
  const taxonomyService = getTaxonomyService(req.scope)

  const brands = brandIds.length
    ? await brandService.listBrands({ id: brandIds })
    : []
  await assertAllIdsExist(brandIds, brands, "Brands")

  const taxonomy_terms = taxonomyTermIds.length
    ? await taxonomyService.listTaxonomyTerms({ id: taxonomyTermIds })
    : []
  await assertAllIdsExist(taxonomyTermIds, taxonomy_terms, "Taxonomy terms")

  const existingProductBrands = await brandService.listProductBrands({
    product_id: productId,
  })
  const existingProductTaxonomyTerms =
    await taxonomyService.listProductTaxonomyTerms({
      product_id: productId,
    })

  if (existingProductBrands.length) {
    await brandService.deleteProductBrands(
      existingProductBrands.map((item) => item.id)
    )
  }

  if (existingProductTaxonomyTerms.length) {
    await taxonomyService.deleteProductTaxonomyTerms(
      existingProductTaxonomyTerms.map((item) => item.id)
    )
  }

  const product_brands = brandIds.length
    ? await brandService.createProductBrands(
        brandIds.map((brandId, index) => ({
          product_id: productId,
          brand_id: brandId,
          is_primary: input.primary_brand_id
            ? brandId === input.primary_brand_id
            : index === 0,
          sort_order: index,
        }))
      )
    : []

  const product_taxonomy_terms = taxonomyTermIds.length
    ? await taxonomyService.createProductTaxonomyTerms(
        taxonomyTermIds.map((termId, index) => ({
          product_id: productId,
          term_id: termId,
          sort_order: index,
        }))
      )
    : []

  res.status(200).json({
    product_id: productId,
    product_brands,
    product_taxonomy_terms,
    brands,
    taxonomy_terms,
  })
}
