import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"

import { BRAND_MODULE } from "../../modules/brand"

type ProductRecord = {
  id: string
  title?: string | null
  handle?: string | null
}

type LinkRecord = {
  id: string
}

const PAGE_SIZE = 100
const DELETE_BATCH_SIZE = 20

export default async function clear_products({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const brandService = container.resolve(BRAND_MODULE) as any

  const products: ProductRecord[] = []
  let offset = 0

  while (true) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "title", "handle"],
      pagination: {
        skip: offset,
        take: PAGE_SIZE,
      },
    })

    const page = data as ProductRecord[]
    products.push(...page)

    if (page.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE
  }

  if (!products.length) {
    logger.info("No products found to delete.")
    console.log("active_products=0")
    return
  }

  logger.info(`Deleting ${products.length} product(s)...`)
  console.log(`deleting_products=${products.length}`)

  for (const product of products) {
    const productBrands = (await brandService.listProductBrands({
      product_id: product.id,
    })) as LinkRecord[]
    if (productBrands.length) {
      await brandService.deleteProductBrands(
        productBrands.map((link) => link.id)
      )
    }
  }

  for (let index = 0; index < products.length; index += DELETE_BATCH_SIZE) {
    const batch = products.slice(index, index + DELETE_BATCH_SIZE)
    await deleteProductsWorkflow(container).run({
      input: {
        ids: batch.map((product) => product.id),
      },
    })
  }

  logger.info(`Deleted ${products.length} product(s).`)
  console.log(`deleted_products=${products.length}`)
}
