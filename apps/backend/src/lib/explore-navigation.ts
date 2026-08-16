export const EXPLORE_GROUP_DEFINITIONS = [
  {
    code: "explore_shop_by_shape",
    label: "Shop by Shape",
    slug: "shop-by-shape",
    sort_order: 10,
  },
  {
    code: "explore_shop_by_category",
    label: "Shop by Category",
    slug: "shop-by-category",
    sort_order: 20,
  },
  {
    code: "explore_popular_anime",
    label: "Popular Anime",
    slug: "popular-anime",
    sort_order: 30,
  },
  {
    code: "explore_popular_games",
    label: "Popular Games",
    slug: "popular-games",
    sort_order: 40,
  },
  {
    code: "explore_shop_extras",
    label: "Shop Extras",
    slug: "shop-extras",
    sort_order: 50,
  },
] as const

export const EXPLORE_NAVIGATION_METADATA_KEY = "explore_navigation"
export const EXPLORE_NAVIGATION_MODES = ["standalone", "filter_tabs"] as const

export type ExploreNavigationMode =
  (typeof EXPLORE_NAVIGATION_MODES)[number]

export type StoredExploreNavigation =
  | {
      mode: "standalone"
    }
  | {
      mode: "filter_tabs"
      target_term_id: string
      auto_assign_target: boolean
    }

export type ExploreNavigationTerm = {
  id: string
  name: string
  slug: string
  status?: "draft" | "active" | "archived"
  metadata?: Record<string, unknown> | null
}

export type ExploreNavigationGroup = {
  code: string
  label: string
  slug: string
  taxonomy_id?: string | null
  metadata?: Record<string, unknown> | null
  terms: ExploreNavigationTerm[]
}

export type ResolvedExploreNavigation =
  | {
      mode: "standalone"
      auto_assign_target: false
      target: null
    }
  | {
      mode: "filter_tabs"
      auto_assign_target: boolean
      target: {
        heading_code: string
        heading_label: string
        heading_slug: string
        term_id: string
        term_name: string
        term_slug: string
      } | null
    }

export function readStoredExploreNavigation(
  metadata?: Record<string, unknown> | null
): StoredExploreNavigation {
  const value = metadata?.[EXPLORE_NAVIGATION_METADATA_KEY]

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { mode: "standalone" }
  }

  const config = value as Record<string, unknown>

  if (config.mode !== "filter_tabs") {
    return { mode: "standalone" }
  }

  const targetTermId =
    typeof config.target_term_id === "string"
      ? config.target_term_id.trim()
      : ""

  if (!targetTermId) {
    return { mode: "standalone" }
  }

  return {
    mode: "filter_tabs",
    target_term_id: targetTermId,
    auto_assign_target: config.auto_assign_target !== false,
  }
}

export function withStoredExploreNavigation(
  metadata: Record<string, unknown> | null | undefined,
  navigation: StoredExploreNavigation
) {
  return {
    ...(metadata ?? {}),
    [EXPLORE_NAVIGATION_METADATA_KEY]: navigation,
  }
}

export function resolveExploreNavigation(
  sourceGroup: ExploreNavigationGroup,
  groups: ExploreNavigationGroup[]
): ResolvedExploreNavigation {
  const stored = readStoredExploreNavigation(sourceGroup.metadata)

  if (stored.mode === "standalone") {
    return {
      mode: "standalone",
      auto_assign_target: false,
      target: null,
    }
  }

  const target = findExploreTerm(groups, stored.target_term_id)

  return {
    mode: "filter_tabs",
    auto_assign_target: stored.auto_assign_target,
    target: target
      ? {
          heading_code: target.group.code,
          heading_label: target.group.label,
          heading_slug: target.group.slug,
          term_id: target.term.id,
          term_name: target.term.name,
          term_slug: getPublicExploreTermSlug(target.term),
        }
      : null,
  }
}

export function resolveExploreNavigations<T extends ExploreNavigationGroup>(
  groups: T[]
) {
  return groups.map((group) => ({
    ...group,
    navigation: resolveExploreNavigation(group, groups),
  }))
}

export function expandExploreTermIdsWithAutoAssignments(
  termIds: string[],
  groups: ExploreNavigationGroup[]
) {
  const expanded = new Set(termIds)

  for (const termId of termIds) {
    const source = findExploreTerm(groups, termId)

    if (!source) {
      continue
    }

    const navigation = resolveExploreNavigation(source.group, groups)

    if (
      navigation.mode === "filter_tabs" &&
      navigation.auto_assign_target &&
      navigation.target
    ) {
      expanded.add(navigation.target.term_id)
    }
  }

  return Array.from(expanded)
}

export function getMissingExploreDestinationProductIds(
  sourceProductIds: string[],
  destinationProductIds: string[]
) {
  const linkedProductIds = new Set(destinationProductIds)

  return Array.from(new Set(sourceProductIds)).filter(
    (productId) => !linkedProductIds.has(productId)
  )
}

export function getExploreNavigationValidationError({
  sourceGroup,
  targetTermId,
  groups,
}: {
  sourceGroup: ExploreNavigationGroup
  targetTermId: string
  groups: ExploreNavigationGroup[]
}) {
  const target = findExploreTerm(groups, targetTermId)

  if (!target) {
    return "Destination Explore item was not found."
  }

  if (target.group.code === sourceGroup.code) {
    return "The tab group and destination must use different Explore headings."
  }

  if (target.term.status && target.term.status !== "active") {
    return "The destination Explore item must be visible."
  }

  const targetNavigation = readStoredExploreNavigation(target.group.metadata)

  if (targetNavigation.mode !== "standalone") {
    return "The destination heading must use standalone pages."
  }

  for (const group of groups) {
    if (group.code === sourceGroup.code) {
      continue
    }

    const navigation = readStoredExploreNavigation(group.metadata)

    if (
      navigation.mode === "filter_tabs" &&
      navigation.target_term_id === targetTermId
    ) {
      return `${group.label} already uses this destination Explore item.`
    }

    if (navigation.mode === "filter_tabs") {
      const existingTarget = findExploreTerm(groups, navigation.target_term_id)

      if (existingTarget?.group.code === sourceGroup.code) {
        return `${sourceGroup.label} is already a destination heading for ${group.label}.`
      }
    }
  }

  return null
}

export function getPublicExploreTermSlug(term: ExploreNavigationTerm) {
  const metadataSlug = term.metadata?.slug

  return typeof metadataSlug === "string" && metadataSlug.trim()
    ? metadataSlug.trim()
    : term.slug
}

export function findExploreTerm(
  groups: ExploreNavigationGroup[],
  termId: string
) {
  for (const group of groups) {
    const term = group.terms.find((candidate) => candidate.id === termId)

    if (term) {
      return { group, term }
    }
  }

  return null
}
