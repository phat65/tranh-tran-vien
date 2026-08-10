// Service Medusa chứa nghiệp vụ và thao tác dữ liệu cho module taxonomy.

import { MedusaService } from "@medusajs/framework/utils"

import ProductTaxonomyTerm from "./models/product-taxonomy-term"
import Taxonomy from "./models/taxonomy"
import TaxonomyTerm from "./models/taxonomy-term"

class TaxonomyModuleService extends MedusaService({
  ProductTaxonomyTerm,
  Taxonomy,
  TaxonomyTerm,
}) {}

export default TaxonomyModuleService
