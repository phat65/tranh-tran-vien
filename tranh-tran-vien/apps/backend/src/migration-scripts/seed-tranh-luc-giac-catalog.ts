import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  batchLinkProductsToCategoryWorkflow,
  batchLinkProductsToCollectionWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  deleteCollectionsWorkflow,
  linkProductsToSalesChannelWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

import {
  HEXAGON_PRODUCT_PRICE_VND,
  HEXAGON_PRODUCT_SEEDS,
} from "./tranh-luc-giac-products"

type IdRecord = {
  id: string
}

type CategoryRecord = IdRecord & {
  name?: string | null
  handle?: string | null
}

type CollectionRecord = IdRecord & {
  title?: string | null
  handle?: string | null
}

type ProductOptionRecord = IdRecord & {
  title?: string | null
}

type ProductRecord = IdRecord & {
  handle?: string | null
  metadata?: Record<string, unknown> | null
  sales_channels?: {
    id: string
    name?: string | null
  }[]
  categories?: {
    id: string
    handle?: string | null
  }[]
  collection?: {
    id: string
    handle?: string | null
  } | null
}

type SalesChannelRecord = IdRecord & {
  name?: string | null
}

type ShippingProfileRecord = IdRecord

type StockLocationRecord = IdRecord & {
  name?: string | null
}

type VariantRecord = IdRecord & {
  sku?: string | null
  inventory_items?: {
    inventory_item_id?: string | null
    id?: string | null
  }[]
}

type InventoryLevelRecord = IdRecord & {
  inventory_item_id: string
  location_id: string
}

const categorySeeds = [
  {
    name: "Tranh l\u1ee5c gi\u00e1c h\u1ee3p kim",
    handle: "tranh-luc-giac-hop-kim",
  },
  {
    name: "POKE Framium \u2013 Khung Pok\u00e9mon l\u1ee5c gi\u00e1c",
    handle: "poke-framium-khung-pokemon-luc-giac",
  },
  {
    name: "POKE Framium \u2013 Khung Pok\u00e9mon acrylic",
    handle: "poke-framium-khung-pokemon-acrylic",
  },
]

const collectionSeeds = [
  {
    title: "Anime",
    handle: "anime",
  },
  {
    title: "Dragon Ball",
    handle: "dragon-ball",
  },
]

const obsoleteCategoryHandles = [
  "tranh-luc-giac",
  "anime",
  "dragon-ball",
  "tranhlucgiachopkim",
  "khungpokemonlucgiac",
  "khungpokemonacrylic",
]
const obsoleteCollectionHandles = ["dragonball"]

const optionSeed = {
  title: "Kich thuoc",
  value: "Luc giac tieu chuan",
}

const customHexagonProductSeed = {
  title: "Custom Hexagon Poster",
  handle: "custom-hexagon-poster",
  sku: "TTV-CUSTOM-HEXAGON-POSTER",
  price: HEXAGON_PRODUCT_PRICE_VND,
}

export default async function seed_tranh_luc_giac_catalog({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const staticAssetBaseUrl = (
    process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000/static"
  ).replace(/\/$/, "")

  logger.info("Seeding Tranh luc giac catalog data...")

  const salesChannel = await resolveSalesChannel(query)
  const shippingProfile = await resolveShippingProfile(query)
  const stockLocation = await resolveStockLocation(query)
  const categories = await ensureCategories(container, query)
  const collections = await ensureCollections(container, query)
  const option = await ensureProductOption(container, query)
  const hexagonMetalCategory = categories.find(
    (category) => category.handle === "tranh-luc-giac-hop-kim"
  )!
  const dragonBallCollection = collections.find(
    (collection) => collection.handle === "dragon-ball"
  )!
  const existingProducts = await loadProductsByHandle(
    query,
    HEXAGON_PRODUCT_SEEDS.map((product) => product.handle)
  )
  const existingHandles = new Set(
    existingProducts.map((product) => product.handle).filter(Boolean)
  )
  const productsToCreate = HEXAGON_PRODUCT_SEEDS.filter(
    (product) => !existingHandles.has(product.handle)
  )

  if (productsToCreate.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: productsToCreate.map((product) => {
          const imageUrl = `${staticAssetBaseUrl}/${product.imagePath}`

          return {
            title: product.title,
            category_ids: [hexagonMetalCategory.id],
            collection_id: dragonBallCollection.id,
            description:
              "Tranh luc giac chu de Dragon Ball cho setup goc lam viec, phong ngu va tuong decor.",
            handle: product.handle,
            weight: 250,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
              {
                url: imageUrl,
              },
            ],
            options: [{ id: option.id }],
            variants: [
              {
                title: optionSeed.value,
                sku: product.sku,
                options: {
                  [optionSeed.title]: optionSeed.value,
                },
                prices: [
                  {
                    amount: HEXAGON_PRODUCT_PRICE_VND,
                    currency_code: "vnd",
                  },
                  {
                    amount: 5,
                    currency_code: "usd",
                  },
                  {
                    amount: 5,
                    currency_code: "eur",
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: salesChannel.id,
              },
            ],
            metadata: {
              product_line: "tranh-luc-giac",
              collection_tags: ["anime", "dragon-ball"],
              source_batch: "dot-1",
              source_image_path: product.imagePath,
            },
          }
        }),
      },
    })
  }

  const allHexagonProducts = await loadProductsByHandle(
    query,
    HEXAGON_PRODUCT_SEEDS.map((product) => product.handle)
  )
  const allHexagonProductIds = allHexagonProducts.map((product) => product.id)

  if (allHexagonProducts.length) {
    await updateProductsWorkflow(container).run({
      input: {
        products: allHexagonProducts.map((product) => ({
          id: product.id,
          category_ids: [hexagonMetalCategory.id],
          collection_id: dragonBallCollection.id,
          sales_channels: [{ id: salesChannel.id }],
          metadata: {
            ...(product.metadata ?? {}),
            product_line: "tranh-luc-giac-hop-kim",
            collection_tags: ["anime", "dragon-ball"],
            source_batch: "dot-1",
          },
        })),
      },
    })
  }

  if (allHexagonProductIds.length) {
    await linkProductsToSalesChannelWorkflow(container).run({
      input: {
        id: salesChannel.id,
        add: allHexagonProductIds,
      },
    })

    await syncCategoryLinks(container, query, allHexagonProductIds, hexagonMetalCategory)
    await syncCollectionLinks(
      container,
      query,
      allHexagonProductIds,
      dragonBallCollection
    )
  }

  await ensureCustomHexagonProduct(container, query, {
    category: hexagonMetalCategory,
    option,
    salesChannel,
    shippingProfile,
  })

  await cleanupObsoleteCategories(container, query)
  await cleanupObsoleteCollections(container, query)

  await ensureInventoryLevels(
    container,
    query,
    stockLocation.id,
    [
      ...HEXAGON_PRODUCT_SEEDS.map((product) => product.sku),
      customHexagonProductSeed.sku,
    ]
  )

  logger.info(
    `Finished Tranh luc giac catalog seed. Created ${productsToCreate.length}, skipped ${existingProducts.length}.`
  )
}

async function ensureCustomHexagonProduct(
  container: MedusaContainer,
  query: any,
  input: {
    category: CategoryRecord
    option: ProductOptionRecord
    salesChannel: SalesChannelRecord
    shippingProfile: ShippingProfileRecord
  }
) {
  const existing = await loadProductsByHandle(query, [
    customHexagonProductSeed.handle,
  ])
  const existingProduct = existing[0]

  if (!existingProduct) {
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: customHexagonProductSeed.title,
            handle: customHexagonProductSeed.handle,
            description:
              "Custom uploaded hexagon poster used by the wall builder.",
            category_ids: [input.category.id],
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: input.shippingProfile.id,
            options: [{ id: input.option.id }],
            variants: [
              {
                title: optionSeed.value,
                sku: customHexagonProductSeed.sku,
                options: {
                  [optionSeed.title]: optionSeed.value,
                },
                prices: [
                  {
                    amount: customHexagonProductSeed.price,
                    currency_code: "vnd",
                  },
                  {
                    amount: 5,
                    currency_code: "usd",
                  },
                  {
                    amount: 5,
                    currency_code: "eur",
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: input.salesChannel.id,
              },
            ],
            metadata: {
              ttv_custom_type: "hexagon_poster",
              product_line: "tranh-luc-giac-hop-kim",
              hidden_from_storefront: true,
              hidden_from_wall_picker: true,
            },
          },
        ],
      },
    })

    return
  }

  await updateProductsWorkflow(container).run({
    input: {
      products: [
        {
          id: existingProduct.id,
          category_ids: [input.category.id],
          sales_channels: [{ id: input.salesChannel.id }],
          metadata: {
            ...(existingProduct.metadata ?? {}),
            ttv_custom_type: "hexagon_poster",
            product_line: "tranh-luc-giac-hop-kim",
            hidden_from_storefront: true,
            hidden_from_wall_picker: true,
          },
        },
      ],
    },
  })

  await linkProductsToSalesChannelWorkflow(container).run({
    input: {
      id: input.salesChannel.id,
      add: [existingProduct.id],
    },
  })

  await batchLinkProductsToCategoryWorkflow(container).run({
    input: {
      id: input.category.id,
      add: [existingProduct.id],
    },
  })
}

async function ensureCategories(
  container: MedusaContainer,
  query: any
): Promise<CategoryRecord[]> {
  const existing = await loadCategories(query, categorySeeds.map((item) => item.handle))
  const existingByHandle = new Map(
    existing
      .filter((category) => category.handle)
      .map((category) => [category.handle as string, category])
  )
  const missing = categorySeeds.filter((item) => !existingByHandle.has(item.handle))

  if (missing.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missing.map((item) => ({
          name: item.name,
          handle: item.handle,
          is_active: true,
        })),
      },
    })

    for (const category of result as CategoryRecord[]) {
      if (category.handle) {
        existingByHandle.set(category.handle, category)
      }
    }
  }

  return categorySeeds.map((item) => {
    const category = existingByHandle.get(item.handle)

    if (!category) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Category not found after seed: ${item.handle}`
      )
    }

    return category
  })
}

async function ensureCollections(
  container: MedusaContainer,
  query: any
): Promise<CollectionRecord[]> {
  const existing = await loadCollections(
    query,
    collectionSeeds.map((item) => item.handle)
  )
  const existingByHandle = new Map(
    existing
      .filter((collection) => collection.handle)
      .map((collection) => [collection.handle as string, collection])
  )
  const missing = collectionSeeds.filter(
    (item) => !existingByHandle.has(item.handle)
  )

  if (missing.length) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: {
        collections: missing,
      },
    })

    for (const collection of result as CollectionRecord[]) {
      if (collection.handle) {
        existingByHandle.set(collection.handle, collection)
      }
    }
  }

  return collectionSeeds.map((item) => {
    const collection = existingByHandle.get(item.handle)

    if (!collection) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Collection not found after seed: ${item.handle}`
      )
    }

    return collection
  })
}

async function ensureProductOption(
  container: MedusaContainer,
  query: any
): Promise<ProductOptionRecord> {
  const existing = await loadProductOptions(query)
  const option = existing.find((item) => item.title === optionSeed.title)

  if (option) {
    return option
  }

  const { result } = await createProductOptionsWorkflow(container).run({
    input: {
      product_options: [
        {
          title: optionSeed.title,
          values: [optionSeed.value],
        },
      ],
    },
  })

  return (result as ProductOptionRecord[])[0]
}

async function resolveSalesChannel(query: any): Promise<SalesChannelRecord> {
  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const salesChannels = data as SalesChannelRecord[]

  if (!salesChannels.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No sales channel found. Run the base Medusa setup first."
    )
  }

  return (
    salesChannels.find((item) => item.name === "tranhtranvien") ??
    salesChannels.find((item) => item.name === "Vietnam Sales Channel") ??
    salesChannels.find((item) => item.name === "Default Sales Channel") ??
    salesChannels[0]
  )
}

async function resolveShippingProfile(query: any): Promise<ShippingProfileRecord> {
  const { data } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfiles = data as ShippingProfileRecord[]

  if (!shippingProfiles.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No shipping profile found. Run database migrations first."
    )
  }

  return shippingProfiles[0]
}

async function resolveStockLocation(query: any): Promise<StockLocationRecord> {
  const { data } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const locations = data as StockLocationRecord[]

  if (!locations.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No stock location found. Run the base Medusa setup first."
    )
  }

  return (
    locations.find((item) => item.name === "Vietnam Warehouse") ??
    locations.find((item) => item.name === "European Warehouse") ??
    locations[0]
  )
}

async function loadCategories(
  query: any,
  handles: string[]
): Promise<CategoryRecord[]> {
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
    filters: {
      handle: handles,
    },
  })

  return data as CategoryRecord[]
}

async function loadCollections(
  query: any,
  handles: string[]
): Promise<CollectionRecord[]> {
  const { data } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title", "handle"],
    filters: {
      handle: handles,
    },
  })

  return data as CollectionRecord[]
}

async function loadProductOptions(query: any): Promise<ProductOptionRecord[]> {
  const { data } = await query.graph({
    entity: "product_option",
    fields: ["id", "title"],
  })

  return data as ProductOptionRecord[]
}

async function loadProductsByHandle(
  query: any,
  handles: string[]
): Promise<ProductRecord[]> {
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "metadata",
      "sales_channels.id",
      "sales_channels.name",
      "categories.id",
      "categories.handle",
      "collection.id",
      "collection.handle",
    ],
    filters: {
      handle: handles,
    },
  })

  return data as ProductRecord[]
}

async function syncCategoryLinks(
  container: MedusaContainer,
  query: any,
  productIds: string[],
  targetCategory: CategoryRecord
) {
  const categories = await loadCategories(query, [
    ...obsoleteCategoryHandles,
    ...categorySeeds.map((item) => item.handle),
  ])
  const categoriesToRemove = categories.filter(
    (category) => category.id !== targetCategory.id
  )

  if (categoriesToRemove.length) {
    for (const category of categoriesToRemove) {
      await batchLinkProductsToCategoryWorkflow(container).run({
        input: {
          id: category.id,
          remove: productIds,
        },
      })
    }
  }

  await batchLinkProductsToCategoryWorkflow(container).run({
    input: {
      id: targetCategory.id,
      add: productIds,
    },
  })
}

async function syncCollectionLinks(
  container: MedusaContainer,
  query: any,
  productIds: string[],
  targetCollection: CollectionRecord
) {
  const collections = await loadCollections(
    query,
    collectionSeeds.map((item) => item.handle)
  )
  const collectionsToRemove = collections.filter(
    (collection) => collection.id !== targetCollection.id
  )

  if (collectionsToRemove.length) {
    for (const collection of collectionsToRemove) {
      await batchLinkProductsToCollectionWorkflow(container).run({
        input: {
          id: collection.id,
          remove: productIds,
        },
      })
    }
  }

  await batchLinkProductsToCollectionWorkflow(container).run({
    input: {
      id: targetCollection.id,
      add: productIds,
    },
  })
}

async function cleanupObsoleteCategories(
  container: MedusaContainer,
  query: any
) {
  const productModuleService = container.resolve(Modules.PRODUCT) as any
  const obsoleteCategories = await loadCategories(query, obsoleteCategoryHandles)

  if (!obsoleteCategories.length) {
    return
  }

  await productModuleService.softDeleteProductCategories(
    obsoleteCategories.map((category) => category.id)
  )
}

async function cleanupObsoleteCollections(
  container: MedusaContainer,
  query: any
) {
  const obsoleteCollections = await loadCollections(query, obsoleteCollectionHandles)

  if (!obsoleteCollections.length) {
    return
  }

  await deleteCollectionsWorkflow(container).run({
    input: {
      ids: obsoleteCollections.map((collection) => collection.id),
    },
  })
}

async function ensureInventoryLevels(
  container: MedusaContainer,
  query: any,
  locationId: string,
  skus: string[]
) {
  const variants = await loadVariantsBySku(query, skus)
  const inventoryItemIds = variants
    .map((variant) => getInventoryItemId(variant))
    .filter((id): id is string => Boolean(id))
  const existingLevels = await loadInventoryLevels(query, inventoryItemIds, [
    locationId,
  ])
  const existingKeys = new Set(
    existingLevels.map((level) =>
      getInventoryLevelKey(level.inventory_item_id, level.location_id)
    )
  )
  const creates = inventoryItemIds
    .filter((inventoryItemId) =>
      !existingKeys.has(getInventoryLevelKey(inventoryItemId, locationId))
    )
    .map((inventoryItemId) => ({
      location_id: locationId,
      stocked_quantity: 1000000,
      inventory_item_id: inventoryItemId,
    }))

  if (!creates.length) {
    return
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: creates,
    },
  })
}

async function loadVariantsBySku(
  query: any,
  skus: string[]
): Promise<VariantRecord[]> {
  const { data } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "inventory_items.*"],
    filters: {
      sku: skus,
    },
  })

  return data as VariantRecord[]
}

async function loadInventoryLevels(
  query: any,
  inventoryItemIds: string[],
  locationIds: string[]
): Promise<InventoryLevelRecord[]> {
  if (!inventoryItemIds.length || !locationIds.length) {
    return []
  }

  const { data } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "inventory_item_id", "location_id"],
    filters: {
      inventory_item_id: inventoryItemIds,
      location_id: locationIds,
    },
  })

  return data as InventoryLevelRecord[]
}

function getInventoryItemId(variant: VariantRecord): string | null {
  const inventoryItem = variant.inventory_items?.[0]

  return inventoryItem?.inventory_item_id ?? inventoryItem?.id ?? null
}

function getInventoryLevelKey(inventoryItemId: string, locationId: string) {
  return `${inventoryItemId}:${locationId}`
}
