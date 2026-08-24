// Template ghép dữ liệu và component để dựng khu vực storefront.

import { Suspense, type ReactNode } from "react"

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CategoryToolbar from "@modules/categories/components/category-toolbar"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  q,
  countryCode,
  categoryId,
  collectionId,
  categories,
  collections,
}: {
  sortBy?: SortOptions
  page?: string
  q?: string
  countryCode: string
  categoryId?: string
  collectionId?: string
  categories: HttpTypes.StoreProductCategory[]
  collections: HttpTypes.StoreCollection[]
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const rootCategories = sortCategories(categories).filter(
    (category) => !category.parent_category_id
  )
  const sortedCollections = sortCollections(collections)

  return (
    <main className="bg-white" data-testid="category-container">
      <section className="border-b border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-10 small:py-14">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-small-regular text-ui-fg-subtle">
            <LocalizedClientLink href="/" className="hover:text-ui-fg-base">
              Home
            </LocalizedClientLink>
            <span>/</span>
            <span className="text-ui-fg-base">Tất cả sản phẩm</span>
          </div>
          <h1
            className="max-w-[46rem] text-[2.75rem] font-semibold leading-[0.98] tracking-normal text-ui-fg-base small:text-[4rem]"
            data-testid="store-page-title"
          >
            Tất cả sản phẩm
          </h1>
          <p className="mt-6 max-w-[42rem] text-base leading-7 text-ui-fg-subtle">
            Lọc theo dòng tranh hoặc bộ sưu tập, sắp xếp theo thời gian, giá
            hoặc tên sản phẩm.
          </p>
        </div>
      </section>

      <section className="content-container py-8">
        {!!rootCategories.length && (
          <FilterBlock title="Danh mục">
            <FilterChip
              href={buildStoreHref({ q, sortBy: sort, collectionId })}
              active={!categoryId}
            >
              Tất cả danh mục
            </FilterChip>
            {rootCategories.map((category) => (
              <FilterChip
                key={category.id}
                href={buildStoreHref({
                  q,
                  sortBy: sort,
                  categoryId: category.id,
                  collectionId,
                })}
                active={categoryId === category.id}
              >
                {category.name}
              </FilterChip>
            ))}
          </FilterBlock>
        )}

        {!!sortedCollections.length && (
          <FilterBlock title="Bộ sưu tập">
            <FilterChip
              href={buildStoreHref({ q, sortBy: sort, categoryId })}
              active={!collectionId}
            >
              Tất cả bộ sưu tập
            </FilterChip>
            {sortedCollections.map((collection) => (
              <FilterChip
                key={collection.id}
                href={buildStoreHref({
                  q,
                  sortBy: sort,
                  categoryId,
                  collectionId: collection.id,
                })}
                active={collectionId === collection.id}
              >
                {collection.title}
              </FilterChip>
            ))}
          </FilterBlock>
        )}

        <CategoryToolbar
          q={q}
          sortBy={sort}
          searchPlaceholder="Tìm tên tranh, chủ đề hoặc mã sản phẩm"
        />

        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            q={q}
            countryCode={countryCode}
            categoryId={categoryId}
            collectionId={collectionId}
            showCount
          />
        </Suspense>
      </section>
    </main>
  )
}

export default StoreTemplate

function FilterBlock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="mb-6">
      <p className="txt-compact-small-plus mb-3 text-ui-fg-subtle">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <LocalizedClientLink
      href={href}
      className={`border px-4 py-2 text-small-regular transition-colors ${
        active
          ? "border-ui-border-strong bg-ui-fg-base text-ui-bg-base"
          : "border-ui-border-base bg-white text-ui-fg-subtle hover:border-ui-border-strong hover:text-ui-fg-base"
      }`}
    >
      {children}
    </LocalizedClientLink>
  )
}

function buildStoreHref({
  q,
  sortBy,
  categoryId,
  collectionId,
}: {
  q?: string
  sortBy?: SortOptions
  categoryId?: string
  collectionId?: string
}) {
  const params = new URLSearchParams()

  if (q) {
    params.set("q", q)
  }

  if (sortBy && sortBy !== "created_at") {
    params.set("sortBy", sortBy)
  }

  if (categoryId) {
    params.set("category_id", categoryId)
  }

  if (collectionId) {
    params.set("collection_id", collectionId)
  }

  const query = params.toString()

  return query ? `/store?${query}` : "/store"
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
