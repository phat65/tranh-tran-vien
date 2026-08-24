// API admin xử lý dữ liệu quản trị cho tranh tran vien / catalog / brands / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  brandUpdateBodySchema,
  BrandUpdateBody,
} from "../../validators"
import { assertFound, getBrandService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getBrandService(req.scope)
  const brand = await service.retrieveBrand(req.params.id)

  res.status(200).json({ brand: assertFound(brand, "Brand not found") })
}

export async function POST(
  req: MedusaRequest<BrandUpdateBody>,
  res: MedusaResponse
): Promise<void> {
  const input = brandUpdateBodySchema.parse(req.body)
  const service = getBrandService(req.scope)
  const [brand] = await service.updateBrands({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({ brand: assertFound(brand, "Brand not found") })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getBrandService(req.scope)
  await service.deleteBrands(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "brand",
    deleted: true,
  })
}
