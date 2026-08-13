// API admin xử lý dữ liệu quản trị cho tranh tran vien / rules / options.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaContainer } from "@medusajs/framework/types"

import { safeGraph } from "../utils"

type Option = {
  id: string
  label: string
  subtitle?: string
  image_url?: string | null
}

type ProductRecord = {
  id?: string
  title?: string
  handle?: string
  status?: string
  thumbnail?: string | null
}

type CategoryRecord = {
  id?: string
  name?: string
  handle?: string
}

type CollectionRecord = {
  id?: string
  title?: string
  handle?: string
}

type ProductOptionRecord = {
  id?: string
  title?: string
  values?: ProductOptionValueRecord[]
}

type ProductOptionValueRecord = {
  id?: string
  value?: string
}

type SalesChannelRecord = {
  id?: string
  name?: string
  description?: string | null
}

type RegionRecord = {
  id?: string
  name?: string
  currency_code?: string
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const [
    products,
    categories,
    collections,
    optionValues,
    salesChannels,
    regions,
  ] =
    await Promise.all([
      getProductOptions(req.scope),
      getCategoryOptions(req.scope),
      getCollectionOptions(req.scope),
      getProductOptionValueOptions(req.scope),
      getSalesChannelOptions(req.scope),
      getRegionOptions(req.scope),
    ])

  res.status(200).json({
    products,
    categories,
    collections,
    option_values: optionValues,
    sales_channels: salesChannels,
    regions,
  })
}

async function getProductOptions(scope: MedusaContainer): Promise<Option[]> {
  const products = await safeGraph<ProductRecord>(scope, "product", [
    "id",
    "title",
    "handle",
    "status",
    "thumbnail",
  ])

  return products.map((product) => ({
    id: product.id ?? "",
    label: product.title ?? product.handle ?? product.id ?? "",
    subtitle: [product.handle, product.status].filter(Boolean).join(" / "),
    image_url: product.thumbnail ?? null,
  }))
}

async function getCategoryOptions(scope: MedusaContainer): Promise<Option[]> {
  const categories = await safeGraph<CategoryRecord>(scope, "product_category", [
    "id",
    "name",
    "handle",
  ])

  return categories.map((category) => ({
    id: category.id ?? "",
    label: category.name ?? category.handle ?? category.id ?? "",
    subtitle: category.handle,
  }))
}

async function getCollectionOptions(scope: MedusaContainer): Promise<Option[]> {
  const collections = await safeGraph<CollectionRecord>(
    scope,
    "product_collection",
    ["id", "title", "handle"]
  )

  return collections.map((collection) => ({
    id: collection.id ?? "",
    label: collection.title ?? collection.handle ?? collection.id ?? "",
    subtitle: collection.handle,
  }))
}

async function getProductOptionValueOptions(
  scope: MedusaContainer
): Promise<Option[]> {
  const productOptions = await safeGraph<ProductOptionRecord>(
    scope,
    "product_option",
    ["id", "title", "values.id", "values.value"]
  )

  return productOptions.flatMap((option) => {
    return (option.values ?? []).map((value) => ({
      id: value.id ?? "",
      label: value.value ?? value.id ?? "",
      subtitle: option.title,
    }))
  })
}

async function getSalesChannelOptions(
  scope: MedusaContainer
): Promise<Option[]> {
  const salesChannels = await safeGraph<SalesChannelRecord>(
    scope,
    "sales_channel",
    ["id", "name", "description"]
  )

  return salesChannels.map((channel) => ({
    id: channel.id ?? "",
    label: channel.name ?? channel.id ?? "",
    subtitle: channel.description ?? undefined,
  }))
}

async function getRegionOptions(scope: MedusaContainer): Promise<Option[]> {
  const regions = await safeGraph<RegionRecord>(scope, "region", [
    "id",
    "name",
    "currency_code",
  ])

  return regions.map((region) => ({
    id: region.id ?? "",
    label: region.name ?? region.id ?? "",
    subtitle: region.currency_code?.toUpperCase(),
  }))
}
