// Script dữ liệu chạy qua Medusa để chuẩn bị hoặc cập nhật seed tranh luc giac catalog.

import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductOptionsWorkflow,
  createProductsWorkflow,
  deleteCollectionsWorkflow,
  linkProductsToSalesChannelWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

import {
  DRAGON_BALL_HEXAGON_EXPLORE_SEEDS,
  DRAGON_BALL_HEXAGON_EXPLORE_NAVIGATION_SEEDS,
  DRAGON_BALL_HEXAGON_PRODUCT_PRICE_VND,
  DRAGON_BALL_HEXAGON_PRODUCT_SEEDS,
} from "../../data/dragon-ball-hexagon-products"
import { getStaticAssetBaseUrl } from "../../lib/static-assets"
import {
  seedExploreNavigation,
  seedProductExploreAssignments,
} from "./explore-seed"

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
}

type SalesChannelRecord = IdRecord & {
  name?: string | null
}

type ShippingProfileRecord = IdRecord

type VariantRecord = IdRecord & {
  sku?: string | null
}

// Dragon Ball subject. Keep future Hexagon subjects in separate data files and seed branches.
const dragonBallHexagonProductSeeds = [
  ...DRAGON_BALL_HEXAGON_PRODUCT_SEEDS,
]
const dragonBallHexagonExploreSeeds = [
  ...DRAGON_BALL_HEXAGON_EXPLORE_SEEDS,
]

const legacyCategoryHandles = [
  "tranh-luc-giac-hop-kim",
  "poke-framium-khung-pokemon-luc-giac",
  "poke-framium-khung-pokemon-acrylic",
  "tranh-luc-giac",
  "anime",
  "dragon-ball",
  "tranhlucgiachopkim",
  "khungpokemonlucgiac",
  "khungpokemonacrylic",
]
const legacyCollectionHandles = ["anime", "dragon-ball", "dragonball"]

const optionSeed = {
  title: "Kich thuoc",
  value: "Luc giac tieu chuan",
}

const customHexagonProductSeed = {
  title: "Custom Hexagon Poster",
  handle: "custom-hexagon-poster",
  sku: "TTV-CUSTOM-HEXAGON-POSTER",
  price: DRAGON_BALL_HEXAGON_PRODUCT_PRICE_VND,
}

export default async function seed_hexagon_catalog({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const staticAssetBaseUrl = getStaticAssetBaseUrl()

  logger.info("Seeding Tranh luc giac catalog data...")

  const salesChannel = await resolveSalesChannel(query)
  const shippingProfile = await resolveShippingProfile(query)
  const option = await ensureProductOption(container, query)
  const existingProducts = await loadProductsByHandle(
    query,
    dragonBallHexagonProductSeeds.map((product) => product.handle)
  )
  const existingHandles = new Set(
    existingProducts.map((product) => product.handle).filter(Boolean)
  )
  const productsToCreate = dragonBallHexagonProductSeeds.filter(
    (product) => !existingHandles.has(product.handle)
  )

  if (productsToCreate.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: productsToCreate.map((product) => {
          const imageUrl = `${staticAssetBaseUrl}/${product.imagePath}`

          return {
            title: product.title,
            description:
              "Tranh luc giac chu de Dragon Ball cho setup goc lam viec, phong ngu va tuong decor.",
            handle: product.handle,
            thumbnail: imageUrl,
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
                manage_inventory: false,
                allow_backorder: true,
                options: {
                  [optionSeed.title]: optionSeed.value,
                },
                prices: [
                  {
                    amount: DRAGON_BALL_HEXAGON_PRODUCT_PRICE_VND,
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
    dragonBallHexagonProductSeeds.map((product) => product.handle)
  )
  const allHexagonProductIds = allHexagonProducts.map((product) => product.id)
  const hexagonSeedByHandle = new Map(
    dragonBallHexagonProductSeeds.map((product) => [product.handle, product])
  )

  if (allHexagonProducts.length) {
    await updateProductsWorkflow(container).run({
      input: {
        products: allHexagonProducts.map((product) => {
          const seed = product.handle
            ? hexagonSeedByHandle.get(product.handle)
            : undefined

          return {
            id: product.id,
            category_ids: [],
            collection_id: null,
            sales_channels: [{ id: salesChannel.id }],
            thumbnail: seed
              ? `${staticAssetBaseUrl}/${seed.imagePath}`
              : undefined,
            images: seed
              ? [
                  {
                    url: `${staticAssetBaseUrl}/${seed.imagePath}`,
                  },
                ]
              : undefined,
            metadata: {
              ...withoutLegacyOrganizationMetadata(product.metadata),
              product_line: "tranh-luc-giac-hop-kim",
              source_batch: "dot-1",
              ...(seed ? { source_image_path: seed.imagePath } : {}),
            },
          }
        }),
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

    await seedProductExploreAssignments(
      container,
      dragonBallHexagonExploreSeeds,
      allHexagonProducts
    )
    await seedExploreNavigation(
      container,
      DRAGON_BALL_HEXAGON_EXPLORE_NAVIGATION_SEEDS
    )
  }

  await ensureCustomHexagonProduct(container, query, {
    option,
    salesChannel,
    shippingProfile,
  })

  await cleanupLegacyCategories(container, query)
  await cleanupLegacyCollections(container, query)
  await disableVariantInventory(container, query, [
    ...dragonBallHexagonProductSeeds.map((product) => product.sku),
    customHexagonProductSeed.sku,
  ])

  logger.info(
    `Finished Tranh luc giac catalog seed. Created ${productsToCreate.length}, skipped ${existingProducts.length}.`
  )
}

async function ensureCustomHexagonProduct(
  container: MedusaContainer,
  query: any,
  input: {
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
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: input.shippingProfile.id,
            options: [{ id: input.option.id }],
            variants: [
              {
                title: optionSeed.value,
                sku: customHexagonProductSeed.sku,
                manage_inventory: false,
                allow_backorder: true,
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
          category_ids: [],
          collection_id: null,
          sales_channels: [{ id: input.salesChannel.id }],
          metadata: {
            ...withoutLegacyOrganizationMetadata(existingProduct.metadata),
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
    ],
    filters: {
      handle: handles,
    },
  })

  return data as ProductRecord[]
}

function withoutLegacyOrganizationMetadata(
  metadata: ProductRecord["metadata"]
) {
  const nextMetadata = { ...(metadata ?? {}) }

  delete nextMetadata.collection_tags

  return nextMetadata
}

async function cleanupLegacyCategories(
  container: MedusaContainer,
  query: any
) {
  const productModuleService = container.resolve(Modules.PRODUCT) as any
  const legacyCategories = await loadCategories(query, legacyCategoryHandles)

  if (!legacyCategories.length) {
    return
  }

  await productModuleService.softDeleteProductCategories(
    legacyCategories.map((category) => category.id)
  )
}

async function cleanupLegacyCollections(
  container: MedusaContainer,
  query: any
) {
  const legacyCollections = await loadCollections(query, legacyCollectionHandles)

  if (!legacyCollections.length) {
    return
  }

  await deleteCollectionsWorkflow(container).run({
    input: {
      ids: legacyCollections.map((collection) => collection.id),
    },
  })
}

async function loadVariantsBySku(
  query: any,
  skus: string[]
): Promise<VariantRecord[]> {
  const { data } = await query.graph({
    entity: "variant",
    fields: ["id", "sku"],
    filters: {
      sku: skus,
    },
  })

  return data as VariantRecord[]
}

async function disableVariantInventory(
  container: MedusaContainer,
  query: any,
  skus: string[]
) {
  const variants = await loadVariantsBySku(query, skus)

  for (const variant of variants) {
    await updateProductVariantsWorkflow(container).run({
      input: {
        selector: { id: variant.id },
        update: {
          manage_inventory: false,
          allow_backorder: true,
        },
      },
    })
  }
}
