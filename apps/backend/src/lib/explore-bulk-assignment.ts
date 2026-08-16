export const MAX_BULK_EXPLORE_PRODUCTS = 500

export const BULK_EXPLORE_ACTIONS = ["add", "remove", "move"] as const

export type BulkExploreAction = (typeof BULK_EXPLORE_ACTIONS)[number]
