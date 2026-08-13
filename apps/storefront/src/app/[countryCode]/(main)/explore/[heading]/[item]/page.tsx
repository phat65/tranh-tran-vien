// Dynamic Explore item page. Products come from the Explore taxonomy term selected in admin Product.

import { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import {
  retrieveTtvExploreItem,
  TtvExploreGalleryImage,
} from "@lib/data/ttv-explore"
import { getExploreGalleryImages } from "@lib/util/ttv-explore"
import CategoryToolbar from "@modules/categories/components/category-toolbar"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"

type Props = {
  params: Promise<{
    countryCode: string
    heading: string
    item: string
  }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
      q?: string
      image_id?: string
    }
  >
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const result = await retrieveTtvExploreItem(params.heading, params.item)

  if (!result?.group || !result.item) {
    notFound()
  }

  const title = result.item.seo_title || result.item.name
  const description =
    result.item.seo_description ||
    result.item.description ||
    `${title} Explore page`

  return {
    title: `${title} | Medusa Store`,
    description,
  }
}

export default async function ExploreItemPage(props: Props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page, q, image_id } = searchParams
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const result = await retrieveTtvExploreItem(params.heading, params.item)

  if (!result?.group || !result.item) {
    notFound()
  }

  const productIds = result.product_ids
  const item = result.item
  const galleryImages = getVisibleGalleryImages(item)
  const selectedImageId = typeof image_id === "string" ? image_id : undefined
  const selectedImage = galleryImages.find(
    (image) => image.image_id === selectedImageId
  )
  const productHrefQuery = selectedImage
    ? `?${new URLSearchParams({
        explore_heading: params.heading,
        explore_item: params.item,
        explore_image_id: selectedImage.image_id,
      }).toString()}`
    : undefined

  return (
    <main className="bg-white">
      <section className="border-b border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-10 small:py-14">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-small-regular text-ui-fg-subtle">
            <LocalizedClientLink href="/" className="hover:text-ui-fg-base">
              Home
            </LocalizedClientLink>
            <span>/</span>
            <span>Explore</span>
            <span>/</span>
            <span>{result.group.label}</span>
            <span>/</span>
            <span className="text-ui-fg-base">{item.name}</span>
          </div>
          <h1 className="max-w-[46rem] text-[2.75rem] font-semibold leading-[0.98] tracking-normal text-ui-fg-base small:text-[4rem]">
            {item.name}
          </h1>
          {item.description ? (
            <p className="mt-6 max-w-[42rem] text-base leading-7 text-ui-fg-subtle">
              {item.description}
            </p>
          ) : null}
        </div>
      </section>

      <section className="content-container py-8">
        {galleryImages.length ? (
          <div className="mb-8 grid gap-4">
            <div>
              <p className="txt-compact-small-plus text-ui-fg-subtle">
                Gallery
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-ui-fg-base">
                {item.name}
              </h2>
            </div>
            <div className="grid gap-4 small:grid-cols-2 large:grid-cols-3">
              {galleryImages.map((image) => (
                <LocalizedClientLink
                  key={image.image_id}
                  href={`/explore/${params.heading}/${params.item}?${new URLSearchParams(
                    {
                      ...(typeof q === "string" ? { q } : {}),
                      ...(sortBy ? { sortBy } : {}),
                      image_id: image.image_id,
                    }
                  ).toString()}`}
                  className={`group grid gap-2 ${
                    selectedImage?.image_id === image.image_id
                      ? "text-ui-fg-base"
                      : "text-ui-fg-subtle"
                  }`}
                >
                  <span
                    className={`relative aspect-[4/3] overflow-hidden border bg-ui-bg-subtle ${
                      selectedImage?.image_id === image.image_id
                        ? "border-ui-border-strong ring-2 ring-ui-border-strong"
                        : "border-ui-border-base"
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt || item.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  </span>
                  <span className="grid gap-0.5">
                    <span className="text-small-regular font-semibold">
                      {image.code}
                    </span>
                    {image.original_filename ? (
                      <span className="truncate text-xs text-ui-fg-muted">
                        {image.original_filename}
                      </span>
                    ) : null}
                  </span>
                </LocalizedClientLink>
              ))}
            </div>
            {selectedImage ? (
              <p className="text-small-regular text-ui-fg-subtle">
                Selected image:{" "}
                <span className="font-semibold text-ui-fg-base">
                  {selectedImage.code}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        <CategoryToolbar
          q={typeof q === "string" ? q : undefined}
          sortBy={sort}
          searchPlaceholder="Search products"
        />

        {productIds.length ? (
          <div className="mt-6">
            <Suspense fallback={<SkeletonProductGrid />}>
              <PaginatedProducts
                sortBy={sort}
                page={pageNumber}
                q={typeof q === "string" ? q : undefined}
                productsIds={productIds}
                countryCode={params.countryCode}
                showCount
                productHrefQuery={productHrefQuery}
              />
            </Suspense>
          </div>
        ) : galleryImages.length ? null : (
          <div className="mt-6 border border-ui-border-base p-8 text-small-regular text-ui-fg-subtle">
            No products assigned to this Explore item yet.
          </div>
        )}
      </section>
    </main>
  )
}

function getVisibleGalleryImages(term: Parameters<typeof getExploreGalleryImages>[0]): TtvExploreGalleryImage[] {
  return getExploreGalleryImages(term).filter(
    (image) => image.visibility === "visible"
  )
}
