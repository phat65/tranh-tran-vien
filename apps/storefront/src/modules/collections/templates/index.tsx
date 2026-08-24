// Template ghép dữ liệu và component để dựng khu vực collections.

import { Suspense } from "react"

import CategoryToolbar from "@modules/categories/components/category-toolbar"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import { HttpTypes } from "@medusajs/types"

export default function CollectionTemplate({
  sortBy,
  collection,
  page,
  q,
  countryCode,
}: {
  sortBy?: SortOptions
  collection: HttpTypes.StoreCollection
  page?: string
  q?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <main className="bg-white">
      <section className="border-b border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-10 small:py-14">
          <h1 className="max-w-[46rem] text-[2.75rem] font-semibold leading-[0.98] tracking-normal text-ui-fg-base small:text-[4rem]">
            {collection.title}
          </h1>
        </div>
      </section>

      <section className="content-container py-8">
        <CategoryToolbar
          q={q}
          sortBy={sort}
          searchPlaceholder="Tìm tên tranh trong bộ sưu tập"
        />
        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={collection.products?.length}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            q={q}
            collectionId={collection.id}
            countryCode={countryCode}
            showCount
          />
        </Suspense>
      </section>
    </main>
  )
}
