"use server"

// Storefront data layer cho Explore động từ taxonomy.

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
  terms: TtvExploreTerm[]
}

export type TtvExploreItemResponse = {
  groups: TtvExploreGroup[]
  group: TtvExploreGroup | null
  item: TtvExploreTerm | null
  product_ids: string[]
}

const defaultExploreGroups: TtvExploreGroup[] = [
  {
    code: "explore_shop_by_shape",
    label: "Shop by Shape",
    slug: "shop-by-shape",
    sort_order: 10,
    taxonomy_id: null,
    terms: [],
  },
  {
    code: "explore_shop_by_category",
    label: "Shop by Category",
    slug: "shop-by-category",
    sort_order: 20,
    taxonomy_id: null,
    terms: [],
  },
  {
    code: "explore_popular_anime",
    label: "Popular Anime",
    slug: "popular-anime",
    sort_order: 30,
    taxonomy_id: null,
    terms: [],
  },
  {
    code: "explore_popular_games",
    label: "Popular Games",
    slug: "popular-games",
    sort_order: 40,
    taxonomy_id: null,
    terms: [],
  },
  {
    code: "explore_shop_extras",
    label: "Shop Extras",
    slug: "shop-extras",
    sort_order: 50,
    taxonomy_id: null,
    terms: [],
  },
]

export async function listTtvExploreGroups(): Promise<TtvExploreGroup[]> {
  return sdk.client
    .fetch<{ groups: TtvExploreGroup[] }>(
      "/store/tranh-tran-vien/catalog/explore",
      { cache: "no-store" }
    )
    .then(({ groups }) =>
      Array.isArray(groups) && groups.length ? groups : defaultExploreGroups
    )
    .catch(() => defaultExploreGroups)
}

export async function retrieveTtvExploreItem(
  headingSlug: string,
  itemSlug: string
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
    (entry) => entry.image_id === imageId && entry.visibility === "visible"
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
