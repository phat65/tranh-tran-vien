// Script dữ liệu chạy qua Medusa để chuẩn bị hoặc cập nhật initial data seed.

import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  DRAGON_BALL_HEXAGON_EXPLORE_SEEDS,
  DRAGON_BALL_HEXAGON_EXPLORE_NAVIGATION_SEEDS,
  DRAGON_BALL_HEXAGON_PRODUCT_PRICE_VND,
  DRAGON_BALL_HEXAGON_PRODUCT_SEEDS,
} from "../../data/dragon-ball-hexagon-products";
import { getStaticAssetBaseUrl } from "../../lib/static-assets";
import {
  seedExploreNavigation,
  seedProductExploreAssignments,
} from "./explore-seed";

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );

  const europeanCountries = ["gb", "de", "dk", "se", "fr", "es", "it"];
  const storefrontCountries = [...europeanCountries, "vn"];
  const staticAssetBaseUrl = getStaticAssetBaseUrl();

  logger.info("Seeding store data...");
  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "Vietnam Sales Channel",
          description: "Kenh ban hang Tranh Tran Vien Vietnam",
        },
      ],
    },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "khóa cho shop vietnam",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  });

  const {
    result: [store],
  } = await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Tranh Tran Vien Vietnam",
          supported_currencies: [
            {
              currency_code: "eur",
              is_default: true,
            },
            {
              currency_code: "usd",
              is_default: false,
            },
            {
              currency_code: "vnd",
              is_default: false,
            },
          ],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Europe",
          currency_code: "eur",
          countries: europeanCountries,
          payment_providers: ["pp_system_default"],
        },
        {
          name: "Vietnam",
          currency_code: "vnd",
          countries: ["vn"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  const vietnamRegion = regionResult[1];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: storefrontCountries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
          locations: [
        {
          name: "Vietnam Warehouse",
          address: {
            city: "Ho Chi Minh City",
            country_code: "VN",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  // This is created by a migration script in core.
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfileResult[0];

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Vietnam Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Storefront delivery",
        geo_zones: storefrontCountries.map((country_code) => ({
          country_code,
          type: "country" as const,
        })),
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 10,
          },
          {
            region_id: vietnamRegion.id,
            amount: 30000,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 10,
          },
          {
            region_id: vietnamRegion.id,
            amount: 50000,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding product data...");

  const { result: productOptionsResult } = await createProductOptionsWorkflow(
    container
  ).run({
    input: {
      product_options: [
        {
          title: "Kich thuoc",
          values: ["Luc giac tieu chuan"],
        },
      ],
    },
  });
  const hexagonSizeOption = productOptionsResult.find(
    (o) => o.title === "Kich thuoc"
  )!;
  await createProductsWorkflow(container).run({
    input: {
      products: DRAGON_BALL_HEXAGON_PRODUCT_SEEDS.map((product) => {
        const imageUrl = `${staticAssetBaseUrl}/${product.imagePath}`;

        return {
          title: product.title,
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
          options: [{ id: hexagonSizeOption.id }],
          variants: [
            {
              title: "Luc giac tieu chuan",
              sku: product.sku,
              manage_inventory: false,
              allow_backorder: true,
              options: {
                "Kich thuoc": "Luc giac tieu chuan",
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
              id: defaultSalesChannel.id,
            },
          ],
          metadata: {
            product_line: "tranh-luc-giac-hop-kim",
            source_batch: "dot-1",
            source_image_path: product.imagePath,
          },
        };
      }),
    },
  });
  const { data: seededProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: {
      handle: DRAGON_BALL_HEXAGON_PRODUCT_SEEDS.map(
        (product) => product.handle
      ),
    },
  });
  await seedProductExploreAssignments(
    container,
    DRAGON_BALL_HEXAGON_EXPLORE_SEEDS,
    seededProducts as { id: string; handle?: string | null }[]
  );
  await seedExploreNavigation(
    container,
    DRAGON_BALL_HEXAGON_EXPLORE_NAVIGATION_SEEDS
  );
  logger.info("Finished seeding product data.");
}
