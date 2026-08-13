// Disable product variant inventory tracking for made-to-order printed art.

import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"

type VariantRecord = {
  id: string
  sku?: string | null
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
}

const PAGE_SIZE = 100

export default async function disable_product_inventory({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  let offset = 0
  let updated = 0

  logger.info("Disabling product variant inventory tracking...")

  while (true) {
    const { data } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "manage_inventory", "allow_backorder"],
      pagination: {
        skip: offset,
        take: PAGE_SIZE,
      },
    })
    const variants = data as VariantRecord[]

    if (!variants.length) {
      break
    }

    for (const variant of variants) {
      if (variant.manage_inventory === false && variant.allow_backorder === true) {
        continue
      }

      await updateProductVariantsWorkflow(container).run({
        input: {
          selector: { id: variant.id },
          update: {
            manage_inventory: false,
            allow_backorder: true,
          },
        },
      })
      updated += 1
    }

    offset += PAGE_SIZE
  }

  logger.info(`Disabled inventory tracking for ${updated} variant(s).`)
}
