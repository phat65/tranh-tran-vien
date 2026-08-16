import { MedusaError } from "@medusajs/framework/utils"

import type { BulkExploreAction } from "../../../../../lib/explore-bulk-assignment"

export type ExploreAssignmentLink = {
  id: string
  product_id: string
  term_id: string
}

type PlanBulkExploreAssignmentInput = {
  action: BulkExploreAction
  productIds: string[]
  termId: string
  sourceTermId?: string
  additionalTermIdsToAdd?: string[]
  existingLinks: ExploreAssignmentLink[]
}

export type BulkExploreAssignmentPlan = {
  linksToCreate: Array<{
    product_id: string
    term_id: string
  }>
  linkIdsToDelete: string[]
  updatedProductIds: string[]
  unchangedProductIds: string[]
}

export function planBulkExploreAssignment({
  action,
  productIds,
  termId,
  sourceTermId,
  additionalTermIdsToAdd = [],
  existingLinks,
}: PlanBulkExploreAssignmentInput): BulkExploreAssignmentPlan {
  if (action === "move" && !sourceTermId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Move requires a source Explore item."
    )
  }

  if (action === "move" && sourceTermId === termId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Source and destination Explore items must be different."
    )
  }

  const linksByProductAndTerm = new Map<string, ExploreAssignmentLink[]>()

  for (const link of existingLinks) {
    const key = getLinkKey(link.product_id, link.term_id)
    const current = linksByProductAndTerm.get(key) ?? []

    current.push(link)
    linksByProductAndTerm.set(key, current)
  }

  const linksToCreate: BulkExploreAssignmentPlan["linksToCreate"] = []
  const linkIdsToDelete = new Set<string>()
  const updatedProductIds: string[] = []
  const unchangedProductIds: string[] = []
  const targetTermIds = Array.from(
    new Set([termId, ...additionalTermIdsToAdd])
  )

  for (const productId of productIds) {
    let changed = false
    const targetLinks = getLinks(linksByProductAndTerm, productId, termId)

    if (action === "add" || action === "move") {
      for (const targetTermId of targetTermIds) {
        const links = getLinks(
          linksByProductAndTerm,
          productId,
          targetTermId
        )

        if (!links.length) {
          linksToCreate.push({
            product_id: productId,
            term_id: targetTermId,
          })
          changed = true
        }
      }
    }

    if (action === "remove") {
      for (const link of targetLinks) {
        linkIdsToDelete.add(link.id)
        changed = true
      }
    }

    if (
      action === "move" &&
      sourceTermId &&
      !targetTermIds.includes(sourceTermId)
    ) {
      const sourceLinks = getLinks(
        linksByProductAndTerm,
        productId,
        sourceTermId
      )

      for (const link of sourceLinks) {
        linkIdsToDelete.add(link.id)
        changed = true
      }
    }

    if (changed) {
      updatedProductIds.push(productId)
    } else {
      unchangedProductIds.push(productId)
    }
  }

  return {
    linksToCreate,
    linkIdsToDelete: Array.from(linkIdsToDelete),
    updatedProductIds,
    unchangedProductIds,
  }
}

function getLinks(
  linksByProductAndTerm: Map<string, ExploreAssignmentLink[]>,
  productId: string,
  termId: string
) {
  return linksByProductAndTerm.get(getLinkKey(productId, termId)) ?? []
}

function getLinkKey(productId: string, termId: string) {
  return `${productId}:${termId}`
}
