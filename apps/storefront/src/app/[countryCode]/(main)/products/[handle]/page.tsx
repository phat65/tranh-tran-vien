// Trang route storefront render màn hình countryCode / (main) / products / handle.

import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import {
  listImageProducts,
  retrieveImageProduct,
  TtvImageProduct,
} from "@lib/data/image-products"
import { listProducts } from "@lib/data/products"
import {
  retrieveTtvExploreItem,
  TtvSelectedExploreImage,
} from "@lib/data/ttv-explore"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{
    v_id?: string
    explore_heading?: string
    explore_item?: string
    explore_image_id?: string
  }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat(),
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listImageProducts({
        countryCode: country,
        queryParams: { limit: 500 },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        })),
      )
      .filter((param) => param.handle)
  } catch {
    return []
  }
}

function normalizeHandle(handle: string): string {
  try {
    return decodeURIComponent(handle)
  } catch {
    return handle
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const handle = normalizeHandle(params.handle)
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await retrieveImageProduct({
    countryCode: params.countryCode,
    handle,
  })

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Medusa Store`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | Medusa Store`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  if (!region) {
    notFound()
  }

  const handle = normalizeHandle(params.handle)
  const pricedProduct = await retrieveImageProduct({
    countryCode: params.countryCode,
    handle,
  })

  if (!pricedProduct) {
    const parentProduct = await listProducts({
      countryCode: params.countryCode,
      queryParams: { handle },
    }).then(({ response }) => response.products[0])
    const replacement = parentProduct
      ? await listImageProducts({
          countryCode: params.countryCode,
          queryParams: { parent_handle: handle, limit: 1 },
        }).then(({ response }) => response.products[0])
      : null

    if (replacement?.handle) {
      redirect(
        `/${encodeURIComponent(params.countryCode)}/products/${encodeURIComponent(
          replacement.handle,
        )}`,
      )
    }

    notFound()
  }

  const selectedExploreImage = await toSelectedImageProduct({
    product: pricedProduct,
    headingSlug: searchParams.explore_heading,
    itemSlug: searchParams.explore_item,
  })

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
      images={pricedProduct.images ?? []}
      selectedExploreImage={selectedExploreImage}
      parentProductId={pricedProduct.parent_product_id}
    />
  )
}

async function toSelectedImageProduct({
  product,
  headingSlug,
  itemSlug,
}: {
  product: TtvImageProduct
  headingSlug?: string
  itemSlug?: string
}): Promise<TtvSelectedExploreImage> {
  const explore =
    headingSlug && itemSlug
      ? await retrieveTtvExploreItem(headingSlug, itemSlug)
      : null

  return {
    image_id: product.image_id,
    code: product.image_code,
    url: product.image_url,
    original_filename: product.image_original_filename,
    title: product.image_title,
    handle: product.image_handle,
    alt: product.image_alt,
    virtual_product_id: product.id,
    parent_product_id: product.parent_product_id,
    parent_product_handle: product.parent_product_handle,
    explore_group_code: explore?.group?.code ?? "",
    explore_group_label: explore?.group?.label ?? "",
    explore_group_slug: explore?.group?.slug ?? "",
    explore_item_id: explore?.item?.id ?? "",
    explore_item_name: explore?.item?.name ?? "",
    explore_item_slug: itemSlug ?? "",
  }
}
