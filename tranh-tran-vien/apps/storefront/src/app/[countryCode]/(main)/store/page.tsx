// Trang route storefront render màn hình countryCode / (main) / store.

import { Metadata } from "next"

import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Tất cả sản phẩm",
  description: "Xem tất cả tranh và khung decor đang có.",
}

type StorePageSearchParams = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  q?: string
  category_id?: string | string[]
  collection_id?: string | string[]
}

type Params = {
  searchParams: Promise<StorePageSearchParams>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { sortBy, page, q, category_id, collection_id } = searchParams
  const [categories, collectionsResponse] = await Promise.all([
    listCategories(
      {
        limit: 200,
        include_descendants_tree: true,
      },
      { cache: "no-store" }
    ).catch(() => []),
    listCollections({ limit: "100" }, { cache: "no-store" }).catch(() => ({
      collections: [],
      count: 0,
    })),
  ])

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      q={typeof q === "string" ? q : undefined}
      categoryId={firstQueryValue(category_id)}
      collectionId={firstQueryValue(collection_id)}
      countryCode={params.countryCode}
      categories={categories}
      collections={collectionsResponse.collections}
    />
  )
}

function firstQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}
