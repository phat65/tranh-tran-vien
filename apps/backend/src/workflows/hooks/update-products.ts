import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

import { deleteRemovedProductImagesWorkflow } from "../delete-removed-product-images"

updateProductsWorkflow.hooks.productsUpdated(
  async ({ products }, { container }) => {
    const productIds = products?.map((product) => product.id) ?? []

    if (!productIds.length) {
      return
    }

    try {
      await deleteRemovedProductImagesWorkflow(container).run({
        input: { productIds, onlyDeleted: true },
      })
    } catch (error) {
      const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
      logger.warn(
        `Failed to clean removed product images: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }
)
