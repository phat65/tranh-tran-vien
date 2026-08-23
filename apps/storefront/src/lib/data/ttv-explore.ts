"use server"

// Storefront data layer for Explore backed by native categories and collections.

import { sdk } from "@lib/config"
import { getExploreGalleryImages } from "@lib/util/ttv-explore"

export type TtvExploreTerm = {
  id: string
  taxonomy_id: string
  name: string
  slug: string
  image_url?: string | null
  description?: string | null
  sort_order: number
  seo_title?: string | null
  seo_description?: string | null
  metadata?: Record<string, unknown> | null
}

export type TtvExploreGalleryImage = {
  image_id: string
  code: string
  url: string
  original_filename?: string
  alt?: string
  sort_order: number
  visibility: "visible" | "hidden"
}

export type TtvSelectedExploreImage = {
  image_id: string
  code: string
  url: string
  original_filename?: string
  title?: string
  handle?: string
  alt?: string
  virtual_product_id?: string
  parent_product_id?: string
  parent_product_handle?: string
  explore_group_code: string
  explore_group_label: string
  explore_group_slug: string
  explore_item_id: string
  explore_item_name: string
  explore_item_slug: string
}

export type TtvExploreGroup = {
  code: string
  label: string
  slug: string
  sort_order: number
  taxonomy_id?: string | null
  navigation: TtvExploreNavigation
  terms: TtvExploreTerm[]
}

export type TtvExploreNavigation = {
  mode: "standalone" | "filter_tabs"
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

const standaloneNavigation: TtvExploreNavigation = {
  mode: "standalone",
  auto_assign_target: false,
  target: null,
}

export type TtvExploreItemResponse = {
  groups: TtvExploreGroup[]
  group: TtvExploreGroup | null
  item: TtvExploreTerm | null
  product_ids: string[]
}

const defaultExploreGroups: TtvExploreGroup[] = [
  {
    code: "medusa_categories",
    label: "Danh muc",
    slug: "categories",
    sort_order: 10,
    taxonomy_id: null,
    navigation: standaloneNavigation,
    terms: [],
  },
  {
    code: "medusa_collections",
    label: "Bo suu tap",
    slug: "collections",
    sort_order: 20,
    taxonomy_id: null,
    navigation: standaloneNavigation,
    terms: [],
  },
]

export async function listTtvExploreGroups(): Promise<TtvExploreGroup[]> {
  return sdk.client
    .fetch<{ groups: TtvExploreGroup[] }>(
      "/store/tranh-tran-vien/catalog/explore",
      { cache: "no-store" },
    )
    .then(({ groups }) =>
      Array.isArray(groups) && groups.length ? groups : defaultExploreGroups,
    )
    .catch(() => defaultExploreGroups)
}

export async function retrieveTtvExploreItem(
  headingSlug: string,
  itemSlug: string,
): Promise<TtvExploreItemResponse | null> {
  return sdk.client
    .fetch<TtvExploreItemResponse>("/store/tranh-tran-vien/catalog/explore", {
      query: {
        heading_slug: headingSlug,
        item_slug: itemSlug,
      },
      cache: "no-store",
    })
    .then((response) => response)
    .catch(() => null)
}

export async function retrieveTtvSelectedExploreImage({
  headingSlug,
  itemSlug,
  imageId,
}: {
  headingSlug?: string
  itemSlug?: string
  imageId?: string
}): Promise<TtvSelectedExploreImage | null> {
  if (!headingSlug || !itemSlug || !imageId) {
    return null
  }

  const result = await retrieveTtvExploreItem(headingSlug, itemSlug)

  if (!result?.group || !result.item) {
    return null
  }

  const image = getExploreGalleryImages(result.item).find(
    (entry) => entry.image_id === imageId && entry.visibility === "visible",
  )

  if (!image) {
    return null
  }

  return {
    image_id: image.image_id,
    code: image.code,
    url: image.url,
    original_filename: image.original_filename,
    explore_group_code: result.group.code,
    explore_group_label: result.group.label,
    explore_group_slug: result.group.slug,
    explore_item_id: result.item.id,
    explore_item_name: result.item.name,
    explore_item_slug: itemSlug,
  }
}
