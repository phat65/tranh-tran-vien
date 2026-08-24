// Hàm tiện ích xử lý ttv navigation dùng chung trong storefront.

import type { TtvExploreGroup } from "@lib/data/ttv-explore"
import type { HttpTypes } from "@medusajs/types"

export type TtvNavLink = {
  id: string
  label: string
  href: string
  image_url?: string | null
  parent_id?: string | null
  sort_order?: number
}

export type TtvNavGroup = {
  id: string
  label: string
  image_url?: string | null
  links: TtvNavLink[]
}

export function toTtvExploreNavGroups(
  groups: TtvExploreGroup[] | null | undefined = [],
): TtvNavGroup[] {
  return (Array.isArray(groups) ? groups : [])
    .sort((first, second) => first.sort_order - second.sort_order)
    .map((group) => ({
      id: group.code,
      label: group.label,
      links: [...group.terms]
        .sort((first, second) => first.sort_order - second.sort_order)
        .map((term) => ({
          id: term.id,
          label: term.name,
          href: getTtvExploreHref(group, term),
          image_url: term.image_url,
          sort_order: term.sort_order,
        })),
    }))
}

export function getTtvExploreHref(
  group: TtvExploreGroup,
  term: TtvExploreGroup["terms"][number],
) {
  const nativeHref = term.metadata?.href

  if (typeof nativeHref === "string" && nativeHref.startsWith("/")) {
    return nativeHref
  }

  const navigation = group.navigation

  if (navigation?.mode === "filter_tabs" && navigation.target) {
    return `/explore/${navigation.target.heading_slug}/${
      navigation.target.term_slug
    }?filter=${encodeURIComponent(getPublicExploreTermSlug(term))}`
  }

  return `/explore/${group.slug}/${getPublicExploreTermSlug(term)}`
}

export function buildTtvShopNavGroups({
  categories = [],
  collections = [],
}: {
  categories?: HttpTypes.StoreProductCategory[] | null
  collections?: HttpTypes.StoreCollection[] | null
}): TtvNavGroup[] {
  const categoryLinks = sortRootCategories(categories ?? []).map(
    (category) => ({
      id: `category-${category.id}`,
      label: category.name,
      href: `/categories/${category.handle}`,
      sort_order: category.rank ?? undefined,
    }),
  )
  const collectionLinks = sortCollections(collections ?? []).map(
    (collection) => ({
      id: `collection-${collection.id}`,
      label: collection.title,
      href: `/collections/${collection.handle}`,
    }),
  )

  return [
    ...(categoryLinks.length
      ? [
          {
            id: "categories",
            label: "Kiểu tranh",
            links: categoryLinks,
          },
        ]
      : []),
    ...(collectionLinks.length
      ? [
          {
            id: "collections",
            label: "Chủ đề",
            links: collectionLinks,
          },
        ]
      : []),
  ]
}

export function mergeTtvNavGroups(
  primaryGroups: TtvNavGroup[],
  fallbackGroups: TtvNavGroup[],
): TtvNavGroup[] {
  const seen = new Set<string>()

  return [...primaryGroups, ...fallbackGroups].filter((group) => {
    const key = normalizeSearch(group.label || group.id)

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return group.links.length > 0
  })
}

function sortRootCategories(
  categories: HttpTypes.StoreProductCategory[],
): HttpTypes.StoreProductCategory[] {
  const visible = collectCategories(categories)

  return visible
    .filter((category) => !category.parent_category_id)
    .sort(compareCategories)
}

function collectCategories(
  categories: HttpTypes.StoreProductCategory[],
): HttpTypes.StoreProductCategory[] {
  const byId = new Map<string, HttpTypes.StoreProductCategory>()

  const visit = (category: HttpTypes.StoreProductCategory) => {
    if (!byId.has(category.id)) {
      byId.set(category.id, category)
    }

    ;(category.category_children ?? []).forEach((child) =>
      visit(child as HttpTypes.StoreProductCategory),
    )
  }

  categories.forEach(visit)

  return Array.from(byId.values())
}

function compareCategories(
  first: HttpTypes.StoreProductCategory,
  second: HttpTypes.StoreProductCategory,
) {
  const firstRank = first.rank ?? Number.MAX_SAFE_INTEGER
  const secondRank = second.rank ?? Number.MAX_SAFE_INTEGER

  if (firstRank !== secondRank) {
    return firstRank - secondRank
  }

  return first.name.localeCompare(second.name)
}

function sortCollections(collections: HttpTypes.StoreCollection[]) {
  return [...collections].sort((first, second) =>
    first.title.localeCompare(second.title),
  )
}

function normalizeSearch(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function getPublicExploreTermSlug(
  term: TtvExploreGroup["terms"][number],
) {
  const metadataSlug = term.metadata?.slug

  return typeof metadataSlug === "string" && metadataSlug.trim()
    ? metadataSlug.trim()
    : term.slug
}
