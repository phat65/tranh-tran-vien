// Hàm tiện ích xử lý ttv navigation dùng chung trong storefront.

import type { TtvNavigationItem } from "@lib/data/ttv"
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

export function toTtvNavLinks(
  items: TtvNavigationItem[] | null | undefined = []
): TtvNavLink[] {
  return (Array.isArray(items) ? [...items] : [])
    .filter((item) => !item.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: resolveNavigationHref(item),
      image_url: item.image_url,
      parent_id: item.parent_id,
    }))
}

export function toTtvNavGroups(
  items: TtvNavigationItem[] | null | undefined = []
): TtvNavGroup[] {
  const visibleItems = (Array.isArray(items) ? [...items] : [])
    .filter((item) => item.visibility !== "hidden")
    .sort((a, b) => a.sort_order - b.sort_order)
  const parents = visibleItems.filter((item) => !item.parent_id)
  const childrenByParent = new Map<string, TtvNavigationItem[]>()

  visibleItems.forEach((item) => {
    if (!item.parent_id) {
      return
    }

    childrenByParent.set(item.parent_id, [
      ...(childrenByParent.get(item.parent_id) ?? []),
      item,
    ])
  })

  return parents
    .map((parent) => {
      const children = childrenByParent.get(parent.id) ?? []

      return {
        id: parent.id,
        label: parent.label,
        image_url: parent.image_url,
        links: children.map((child) => ({
          id: child.id,
          label: child.label,
          href: resolveNavigationHref(child),
          image_url: child.image_url,
          parent_id: child.parent_id,
        })),
      }
    })
}

export function toTtvExploreNavGroups(
  groups: TtvExploreGroup[] | null | undefined = []
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
          href: `/explore/${group.slug}/${getPublicExploreTermSlug(term)}`,
          image_url: term.image_url,
          sort_order: term.sort_order,
        })),
    }))
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
    })
  )
  const collectionLinks = sortCollections(collections ?? []).map(
    (collection) => ({
      id: `collection-${collection.id}`,
      label: collection.title,
      href: `/collections/${collection.handle}`,
    })
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
  fallbackGroups: TtvNavGroup[]
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
  categories: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory[] {
  const visible = collectCategories(categories)

  return visible
    .filter((category) => !category.parent_category_id)
    .sort(compareCategories)
}

function collectCategories(
  categories: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory[] {
  const byId = new Map<string, HttpTypes.StoreProductCategory>()

  const visit = (category: HttpTypes.StoreProductCategory) => {
    if (!byId.has(category.id)) {
      byId.set(category.id, category)
    }

    ;(category.category_children ?? []).forEach((child) =>
      visit(child as HttpTypes.StoreProductCategory)
    )
  }

  categories.forEach(visit)

  return Array.from(byId.values())
}

function compareCategories(
  first: HttpTypes.StoreProductCategory,
  second: HttpTypes.StoreProductCategory
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
    first.title.localeCompare(second.title)
  )
}

function normalizeSearch(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function resolveNavigationHref(item: TtvNavigationItem): string {
  if (item.url) {
    return item.url
  }

  if (!item.entity_id) {
    return "/"
  }

  if (item.link_type === "product") {
    return `/products/${item.entity_id}`
  }

  if (item.link_type === "category") {
    return `/categories/${item.entity_id}`
  }

  if (item.link_type === "page") {
    return `/pages/${item.entity_id}`
  }

  if (item.link_type === "post") {
    return `/posts/${item.entity_id}`
  }

  if (item.link_type === "brand") {
    return `/store?brand_id=${item.entity_id}`
  }

  if (item.link_type === "taxonomy") {
    return `/store?taxonomy_term_id=${item.entity_id}`
  }

  return "/"
}

function getPublicExploreTermSlug(term: TtvExploreGroup["terms"][number]) {
  const metadataSlug = term.metadata?.slug

  return typeof metadataSlug === "string" && metadataSlug.trim()
    ? metadataSlug.trim()
    : term.slug
}
