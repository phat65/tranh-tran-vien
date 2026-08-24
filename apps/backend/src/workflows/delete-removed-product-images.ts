import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import {
  deriveFileKey,
  FileModuleWriteService,
  ProductImageRecord,
  ProductImageWriteService,
} from "../lib/product-image-storage"
import { getStaticAssetBaseUrl } from "../lib/static-assets"

export type DeleteRemovedProductImagesInput = {
  productIds: string[]
  onlyDeleted: boolean
}

function findDuplicateImageIds(images: ProductImageRecord[]) {
  const groups = new Map<string, ProductImageRecord[]>()

  for (const image of images) {
    const key = `${image.product_id}:${image.url}`
    groups.set(key, [...(groups.get(key) ?? []), image])
  }

  return Array.from(groups.values()).flatMap((group) => {
    if (group.length < 2) {
      return []
    }

    return [...group]
      .sort((first, second) => {
        const firstTime = first.created_at
          ? new Date(first.created_at).getTime()
          : 0
        const secondTime = second.created_at
          ? new Date(second.created_at).getTime()
          : 0

        return firstTime - secondTime || first.id.localeCompare(second.id)
      })
      .slice(1)
      .map((image) => image.id)
  })
}

const deleteRemovedProductImagesStep = createStep(
  "delete-removed-product-images",
  async (input: DeleteRemovedProductImagesInput, { container }) => {
    if (!input.productIds.length) {
      return new StepResponse({ purgedIds: [], deletedKeys: [] })
    }

    const productService = container.resolve(
      Modules.PRODUCT
    ) as unknown as ProductImageWriteService
    const fileService = container.resolve(
      Modules.FILE
    ) as unknown as FileModuleWriteService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const filters: Record<string, unknown> = {
      product_id: input.productIds,
    }

    if (input.onlyDeleted) {
      filters.deleted_at = { $ne: null }
    }

    const removedImages = await productService.listProductImages(filters, {
      withDeleted: true,
    })
    const duplicateActiveIds = input.onlyDeleted
      ? findDuplicateImageIds(
          await productService.listProductImages(
            { product_id: input.productIds },
            { select: ["id", "url", "product_id", "created_at"] }
          )
        )
      : []
    const purgedIds = [
      ...removedImages.map((image) => image.id),
      ...duplicateActiveIds,
    ]

    if (!purgedIds.length) {
      return new StepResponse({ purgedIds: [], deletedKeys: [] })
    }

    const removedIds = new Set(removedImages.map((image) => image.id))
    const keysToDelete: string[] = []

    for (const url of Array.from(
      new Set(removedImages.map((image) => image.url))
    )) {
      const fileKey = deriveFileKey(url, getStaticAssetBaseUrl())

      if (!fileKey) {
        continue
      }

      const activeImages = await productService.listProductImages({ url })
      const usedOutsideBatch = activeImages.some(
        (image) => !removedIds.has(image.id)
      )

      if (!usedOutsideBatch) {
        keysToDelete.push(fileKey)
      }
    }

    if (keysToDelete.length) {
      try {
        await fileService.deleteFiles(keysToDelete)
      } catch (error) {
        logger.warn(
          `Failed to delete product image files: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    await productService.deleteProductImages(purgedIds)

    return new StepResponse({ purgedIds, deletedKeys: keysToDelete })
  }
)

export const deleteRemovedProductImagesWorkflow = createWorkflow(
  "delete-removed-product-images",
  (input: DeleteRemovedProductImagesInput) =>
    new WorkflowResponse(deleteRemovedProductImagesStep(input))
)
