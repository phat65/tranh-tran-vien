import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import CustomWallTemplate from "@modules/custom-wall/templates"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Build Wall | Tranh Tran Vien",
  description: "Xep thu tranh luc giac len tuong va them vao gio hang.",
}

type CustomWallPageProps = {
  params: Promise<{
    countryCode: string
  }>
}

export default async function CustomWallPage(props: CustomWallPageProps) {
  const params = await props.params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const [{ response }, collectionsResponse] = await Promise.all([
    listProducts({
      countryCode: params.countryCode,
      queryParams: {
        limit: 100,
        fields:
          "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,*categories,*collection,*images",
      },
    }),
    listCollections({ limit: "100" }, { cache: "no-store" }).catch(() => ({
      collections: [],
      count: 0,
    })),
  ])

  return (
    <CustomWallTemplate
      products={response.products}
      collections={collectionsResponse.collections}
      countryCode={params.countryCode}
      currencyCode={region.currency_code}
    />
  )
}
