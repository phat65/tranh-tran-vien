import type { BulkExploreAction } from "../../lib/explore-bulk-assignment"

const EXPLORE_API = "/admin/tranh-tran-vien/catalog/explore"

export type BulkExploreGroup = {
  code: string
  label: string
  navigation?: {
    mode: "standalone" | "filter_tabs"
    auto_assign_target: boolean
    target: {
      heading_label: string
      term_id: string
      term_name: string
    } | null
  }
  terms: Array<{
    id: string
    name: string
  }>
}

type ApplyBulkExploreAssignmentInput = {
  action: BulkExploreAction
  productIds: string[]
  termId: string
  sourceTermId?: string
}

export type BulkExploreAssignmentResponse = {
  requested_count: number
  updated_count: number
  unchanged_count: number
}

export async function applyBulkExploreAssignment({
  action,
  productIds,
  termId,
  sourceTermId,
}: ApplyBulkExploreAssignmentInput) {
  const response = await fetch(EXPLORE_API, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_ids: productIds,
      action,
      term_id: termId,
      ...(action === "move" ? { source_term_id: sourceTermId } : {}),
    }),
  })

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response))
  }

  return (await response.json()) as BulkExploreAssignmentResponse
}

export function getBulkActionLabel(action: BulkExploreAction) {
  if (action === "remove") {
    return "Remove"
  }

  if (action === "move") {
    return "Move"
  }

  return "Add"
}

export function getBulkConfirmationTitle(action: BulkExploreAction) {
  if (action === "remove") {
    return "Remove Explore item?"
  }

  if (action === "move") {
    return "Move products?"
  }

  return "Add Explore item?"
}

export function getBulkConfirmationDescription({
  action,
  productCount,
  sourceName,
  targetName,
}: {
  action: BulkExploreAction
  productCount: number
  sourceName?: string
  targetName: string
}) {
  if (action === "remove") {
    return `Remove ${productCount} selected products from ${targetName}. Other Explore assignments stay unchanged.`
  }

  if (action === "move") {
    return `Move ${productCount} selected products from ${sourceName} to ${targetName}. Other Explore assignments stay unchanged.`
  }

  return `Add ${productCount} selected products to ${targetName}. Current Explore assignments stay unchanged.`
}

async function getApiErrorMessage(response: Response) {
  const text = await response.text()

  if (!text) {
    return `Request failed with status ${response.status}`
  }

  try {
    const payload = JSON.parse(text) as { message?: unknown }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message
    }
  } catch {
    return text
  }

  return text
}
