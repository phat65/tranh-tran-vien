import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"

import { deleteRemovedProductImagesWorkflow } from "../delete-removed-product-images"

deleteProductsWorkflow.hooks.productsDeleted(async ({ ids }, { container }) => {
  if (!ids?.length) {
    return
  }

  try {
    await deleteRemovedProductImagesWorkflow(container).run({
      input: { productIds: ids, onlyDeleted: false },
    })
  } catch (error) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    logger.warn(
      `Failed to clean deleted product images: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
})
