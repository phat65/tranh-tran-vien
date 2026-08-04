import { Metadata } from "next"

import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import {
  getTtvCategoryPageConfig,
  getTtvHomeHeroConfig,
  type TtvCategoryPageConfig,
} from "@lib/data/ttv"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import HomeHeroCarousel from "@modules/home/components/hero-carousel"
import ProductPreview from "@modules/products/components/product-preview"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Tranh Tran Vien",
  description: "Tranh decor, khung Pokemon va combo san pham cho collectors.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const [categories, productsResponse, heroConfig] = await Promise.all([
    listCategories(
      {
        limit: 12,
        include_descendants_tree: true,
      },
      { cache: "no-store" }
    ).catch(() => []),
    listProducts({
      countryCode,
      queryParams: {
        limit: 8,
      },
    }).catch(() => ({
      response: { products: [], count: 0 },
      nextPage: null,
    })),
    getTtvHomeHeroConfig(),
  ])
  const products = productsResponse.response.products
  const displayCategories = getRootCategories(categories).slice(0, 8)
  const categoryConfigs = await Promise.all(
    displayCategories.map((category) =>
      getTtvCategoryPageConfig(category.id).catch(() => null)
    )
  )
  const heroFallbackMediaUrl = products[0]?.thumbnail ?? products[0]?.images?.[0]?.url

  if (!region) {
    return null
  }

  return (
    <main className="bg-white text-ui-fg-base">
      <HomeHeroCarousel
        config={heroConfig}
        fallbackMediaUrl={heroFallbackMediaUrl}
      />

      <section className="content-container py-10">
        <div className="grid gap-3 border-y border-ui-border-base py-5 small:grid-cols-4">
          <TrustItem title="Combo pricing" text="Rules sync directly in cart." />
          <TrustItem title="No-drill setup" text="Built around clean mounting." />
          <TrustItem title="Custom design" text="Send images for made-to-order art." />
          <TrustItem title="Collector focus" text="Built for series, sets and themes." />
        </div>
      </section>

      <section className="content-container py-12">
        <div className="mb-8 max-w-[42rem]">
          <h2 className="text-3xl font-semibold leading-tight">
            Find the right display.
          </h2>
          <p className="mt-3 text-base leading-7 text-ui-fg-subtle">
            Three buying paths stay clear for customers, while products still
            come from Medusa collections and categories.
          </p>
        </div>
        <div className="grid gap-4 small:grid-cols-2 large:grid-cols-3">
          {displayCategories.map((category, index) => (
            <LineCard
              key={category.id}
              index={`${index + 1}`.padStart(2, "0")}
              category={category}
              config={categoryConfigs[index]}
            />
          ))}
        </div>
      </section>

      {!!products.length && (
        <section className="border-y border-ui-border-base bg-ui-bg-subtle">
          <div className="content-container py-12 small:py-16">
            <div className="mb-8 flex items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-semibold leading-tight">
                  San pham moi dang.
                </h2>
                <p className="mt-3 text-base text-ui-fg-subtle">
                  Cac mau moi nhat duoc lay truc tiep tu san pham Medusa.
                </p>
              </div>
              <LocalizedClientLink
                href="/store?sortBy=created_at"
                className="hidden text-small-regular text-ui-fg-interactive hover:text-ui-fg-base small:block"
              >
                Xem tat ca
              </LocalizedClientLink>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 small:grid-cols-4 small:gap-x-6">
              {products.slice(0, 8).map((product) => (
                <li key={product.id}>
                  <ProductPreview product={product} region={region} isFeatured />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  )
}

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="txt-compact-small-plus text-ui-fg-base">{title}</p>
      <p className="mt-1 txt-small text-ui-fg-subtle">{text}</p>
    </div>
  )
}

function LineCard({
  index,
  category,
  config,
}: {
  index: string
  category: HttpTypes.StoreProductCategory
  config: TtvCategoryPageConfig | null
}) {
  const mediaUrl = config?.media_url || config?.banner_image_url
  const title = config?.title || category.name
  const text =
    config?.intro ||
    category.description ||
    `Xem cac mau ${category.name.toLowerCase()} dang co san.`

  return (
    <LocalizedClientLink
      href={`/categories/${category.handle}`}
      className="group grid overflow-hidden border border-ui-border-base bg-white transition-colors hover:border-ui-border-strong"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ui-bg-subtle">
        {mediaUrl ? (
          config?.media_type === "video" ? (
            <video
              src={mediaUrl}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <Image
              src={mediaUrl}
              alt=""
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, 33vw"
              fill
            />
          )
        ) : (
          <div className="h-full w-full bg-ui-bg-subtle" />
        )}
      </div>
      <div className="grid min-h-[12rem] content-between p-6">
        <div>
          <p className="txt-small-plus text-ui-fg-muted">{index}</p>
          <h3 className="mt-5 text-2xl font-semibold leading-tight">{title}</h3>
        </div>
        <p className="mt-4 text-small-regular leading-6 text-ui-fg-subtle">
          {text}
        </p>
        <span className="mt-8 text-small-regular text-ui-fg-interactive group-hover:text-ui-fg-base">
          Xem san pham
        </span>
      </div>
    </LocalizedClientLink>
  )
}

function getRootCategories(categories: HttpTypes.StoreProductCategory[]) {
  return categories
    .filter((category) => !category.parent_category_id)
    .sort((first, second) => {
      const firstRank = first.rank ?? Number.MAX_SAFE_INTEGER
      const secondRank = second.rank ?? Number.MAX_SAFE_INTEGER

      if (firstRank !== secondRank) {
        return firstRank - secondRank
      }

      return first.name.localeCompare(second.name)
    })
}
