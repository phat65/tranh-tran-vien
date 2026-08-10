import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { getTtvCategoryPageConfig } from "@lib/data/ttv"
import { HttpTypes, StoreRegion } from "@medusajs/types"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
      q?: string
      collection_id?: string
    }
  >
}

export async function generateStaticParams() {
  const product_categories = await listCategories()

  if (!product_categories) {
    return []
  }

  const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
    regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
  )

  const categoryHandles = product_categories.map(
    (category: HttpTypes.StoreProductCategory) => category.handle
  )

  const staticParams = countryCodes
    ?.map((countryCode: string | undefined) =>
      categoryHandles.map((handle: string) => ({
        countryCode,
        category: [handle],
      }))
    )
    .flat()

  return staticParams
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const productCategory = await getCategoryByHandle(params.category)
    const categoryPageConfig = await getTtvCategoryPageConfig(
      productCategory.id
    )

    const title = categoryPageConfig.title || productCategory.name

    const description = productCategory.description ?? `${title} category.`

    return {
      title: `${title} | Medusa Store`,
      description,
      alternates: {
        canonical: `${params.category.join("/")}`,
      },
    }
  } catch {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page, q, collection_id } = searchParams

  const productCategory = await getCategoryByHandle(params.category)

  if (!productCategory) {
    notFound()
  }

  const [collectionsResponse, categoryPageConfig] = await Promise.all([
    listCollections({ limit: "100" }, { cache: "no-store" }).catch(() => ({
      collections: [],
      count: 0,
    })),
    getTtvCategoryPageConfig(productCategory.id),
  ])

  return (
    <CategoryTemplate
      category={productCategory}
      sortBy={sortBy}
      page={page}
      q={typeof q === "string" ? q : undefined}
      collectionId={typeof collection_id === "string" ? collection_id : undefined}
      countryCode={params.countryCode}
      collections={collectionsResponse.collections}
      config={categoryPageConfig}
    />
  )
}
