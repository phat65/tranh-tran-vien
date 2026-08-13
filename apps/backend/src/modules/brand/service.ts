// Service Medusa chứa nghiệp vụ và thao tác dữ liệu cho module brand.

import { MedusaService } from "@medusajs/framework/utils"

import Brand from "./models/brand"
import ProductBrand from "./models/product-brand"

class BrandModuleService extends MedusaService({
  Brand,
  ProductBrand,
}) {}

export default BrandModuleService
