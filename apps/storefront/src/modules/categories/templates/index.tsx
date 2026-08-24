// Template ghép dữ liệu và component để dựng khu vực categories.

import { notFound } from "next/navigation"
import { Suspense } from "react"
import Image from "next/image"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import CategoryToolbar from "../components/category-toolbar"
import type { TtvCategoryPageConfig } from "@lib/data/ttv"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  q,
  collectionId,
  countryCode,
  collections,
  config,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  q?: string
  collectionId?: string
  countryCode: string
  collections: HttpTypes.StoreCollection[]
  config: TtvCategoryPageConfig
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)
  const childCategories = sortCategories(category.category_children ?? [])
  const sortedCollections = sortCollections(collections)
  const title = config.title || category.name
  const intro = config.intro || category.description
  const mediaUrl = config.media_url || config.banner_image_url
  const mediaAspectRatio = config.media_aspect_ratio || "16 / 9"

  return (
    <main className="bg-white" data-testid="category-container">
      <section className="border-b border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container grid gap-8 py-10 small:grid-cols-[1.1fr_0.9fr] small:py-14">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2 text-small-regular text-ui-fg-subtle">
              <LocalizedClientLink href="/" className="hover:text-ui-fg-base">
                Home
              </LocalizedClientLink>
              <span>/</span>
              {parents.map((parent) => (
                <span key={parent.id} className="flex items-center gap-2">
                  <LocalizedClientLink
                    href={`/categories/${parent.handle}`}
                    className="hover:text-ui-fg-base"
                  >
                    {parent.name}
                  </LocalizedClientLink>
                  <span>/</span>
                </span>
              ))}
              <span className="text-ui-fg-base">{category.name}</span>
            </div>
            <h1
              className="max-w-[46rem] text-[2.75rem] font-semibold leading-[0.98] tracking-normal text-ui-fg-base small:text-[4rem]"
              data-testid="category-page-title"
            >
              {title}
            </h1>
            {intro && (
              <p className="mt-6 max-w-[42rem] text-base leading-7 text-ui-fg-subtle">
                {intro}
              </p>
            )}
          </div>

          <div
            className="relative overflow-hidden border border-ui-border-base bg-white"
            style={{ aspectRatio: mediaAspectRatio }}
          >
            {mediaUrl ? (
              config.media_type === "video" ? (
                <video
                  src={mediaUrl}
                  className="h-full w-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <Image
                  src={mediaUrl}
                  alt=""
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  priority
                  fill
                />
              )
            ) : (
              <div className="grid h-full content-end gap-3 p-6">
                <p className="txt-compact-small-plus text-ui-fg-muted">
                  Ưu đãi hiện có
                </p>
                <h2 className="text-2xl font-semibold leading-tight">
                  {config.promo_title}
                </h2>
                <p className="text-small-regular leading-6 text-ui-fg-subtle">
                  {config.promo_body}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="content-container py-8">
        {!!childCategories.length && (
          <div className="mb-6">
            <p className="txt-compact-small-plus mb-3 text-ui-fg-subtle">
              Danh mục con
            </p>
            <div className="flex flex-wrap gap-2">
              <LocalizedClientLink
                href={`/categories/${category.handle}`}
                className="border border-ui-border-strong bg-ui-fg-base px-4 py-2 text-small-regular text-ui-bg-base"
              >
                Tất cả {category.name}
              </LocalizedClientLink>
              {childCategories.map((child) => (
                <LocalizedClientLink
                  key={child.id}
                  href={`/categories/${child.handle}`}
                  className="border border-ui-border-base bg-white px-4 py-2 text-small-regular text-ui-fg-subtle transition-colors hover:border-ui-border-strong hover:text-ui-fg-base"
                >
                  {child.name}
                </LocalizedClientLink>
              ))}
            </div>
          </div>
        )}

        {!!sortedCollections.length && (
          <div className="mb-6">
            <p className="txt-compact-small-plus mb-3 text-ui-fg-subtle">
              {config.topic_label}
            </p>
            <div className="flex flex-wrap gap-2">
              <LocalizedClientLink
                href={`/categories/${category.handle}`}
                className={`border px-4 py-2 text-small-regular transition-colors ${
                  collectionId
                    ? "border-ui-border-base bg-white text-ui-fg-subtle hover:border-ui-border-strong hover:text-ui-fg-base"
                    : "border-ui-border-strong bg-ui-fg-base text-ui-bg-base"
                }`}
              >
                Tất cả chủ đề
              </LocalizedClientLink>
              {sortedCollections.map((collection) => (
                <LocalizedClientLink
                  key={collection.id}
                  href={`/categories/${category.handle}?collection_id=${collection.id}`}
                  className={`border px-4 py-2 text-small-regular transition-colors ${
                    collectionId === collection.id
                      ? "border-ui-border-strong bg-ui-fg-base text-ui-bg-base"
                      : "border-ui-border-base bg-white text-ui-fg-subtle hover:border-ui-border-strong hover:text-ui-fg-base"
                  }`}
                >
                  {collection.title}
                </LocalizedClientLink>
              ))}
            </div>
          </div>
        )}

        <CategoryToolbar
          q={q}
          sortBy={sort}
          searchPlaceholder={config.search_placeholder}
        />

        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={category.products?.length ?? 8}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            q={q}
            collectionId={collectionId}
            categoryId={category.id}
            countryCode={countryCode}
            showCount
          />
        </Suspense>
      </section>
    </main>
  )
}

function sortCategories(categories: HttpTypes.StoreProductCategory[]) {
  return [...categories].sort((first, second) => {
    const firstRank = first.rank ?? Number.MAX_SAFE_INTEGER
    const secondRank = second.rank ?? Number.MAX_SAFE_INTEGER

    if (firstRank !== secondRank) {
      return firstRank - secondRank
    }

    return first.name.localeCompare(second.name)
  })
}

function sortCollections(collections: HttpTypes.StoreCollection[]) {
  return [...collections].sort((first, second) =>
    first.title.localeCompare(second.title)
  )
}
