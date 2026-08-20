// Options for the small combo-rule editor.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaContainer } from "@medusajs/framework/types"

import { safeGraph } from "../utils"

type Option = {
  id: string
  label: string
  subtitle?: string
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
  const [categories, collections, salesChannels, regions] = await Promise.all([
    getCategoryOptions(req.scope),
    getCollectionOptions(req.scope),
    getSalesChannelOptions(req.scope),
    getRegionOptions(req.scope),
  ])

  res.status(200).json({
    categories,
    collections,
    sales_channels: salesChannels,
    regions,
  })
}

async function getCategoryOptions(scope: MedusaContainer): Promise<Option[]> {
  const categories = await safeGraph<CategoryRecord>(
    scope,
    "product_category",
    ["id", "name", "handle"]
  )

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
