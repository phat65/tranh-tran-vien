// Script dữ liệu chạy qua Medusa để chuẩn bị hoặc cập nhật initial data seed.

import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  MedusaError,
  ModuleRegistrationName,
  Modules,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  deleteApiKeysWorkflow,
  deleteRegionsWorkflow,
  deleteSalesChannelsWorkflow,
  deleteStoresWorkflow,
  linkProductsToSalesChannelWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  revokeApiKeysWorkflow,
  updateApiKeysWorkflow,
  updateCartWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT,
  );

  const storefrontCountries = ["vn"];
  const vietnamPaymentProviders = [
    "pp_system_default",
    ...(isPayOSConfigured() ? ["pp_payos_payos"] : []),
    ...(isSePayConfigured() ? ["pp_sepay_sepay"] : []),
  ];

  logger.info("Seeding store data...");
  const defaultSalesChannel = await getOrCreateVietnamSalesChannel(
    container,
    query,
  );
  const publishableApiKey = await getSingleVietnamPublishableKey(
    container,
    query,
  );
  logger.info(
    `Storefront publishable key: ${publishableApiKey.token}`,
  );

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  });

  await ensureSingleVietnamStoreAndSalesChannel(
    container,
    query,
    defaultSalesChannel.id,
  );

  logger.info("Seeding region data...");
  const vietnamRegion = await getOrCreateVietnamRegion(
    container,
    query,
    vietnamPaymentProviders,
  );
  await removeNonVietnamRegions(container, query, vietnamRegion.id);
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  const { data: existingTaxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
    filters: { country_code: "vn" },
  });

  if (!existingTaxRegions.length) {
    await createTaxRegionsWorkflow(container).run({
      input: storefrontCountries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
  }
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const stockLocation = await getOrCreateVietnamStockLocation(
    container,
    query,
  );
  await ensureVietnamShippingOption({
    container,
    query,
    link,
    fulfillmentModuleService,
    stockLocation,
    vietnamRegion,
    storefrontCountries,
  });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  });
  logger.info("Finished seeding stock location data.");
  logger.info(
    "Seed complete. Products, categories and collections are managed in Medusa Admin.",
  );
}

function isPayOSConfigured() {
  return Boolean(
    process.env.PAYOS_CLIENT_ID &&
    process.env.PAYOS_API_KEY &&
    process.env.PAYOS_CHECKSUM_KEY &&
    process.env.PAYOS_RETURN_URL &&
    process.env.PAYOS_CANCEL_URL,
  );
}

function isSePayConfigured() {
  return Boolean(
    process.env.SEPAY_BANK_ACCOUNT &&
    process.env.SEPAY_BANK_CODE &&
    process.env.SEPAY_WEBHOOK_SECRET,
  );
}

async function getOrCreateVietnamSalesChannel(
  container: MedusaContainer,
  query: any,
) {
  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "description"],
    filters: { name: "Vietnam Sales Channel" },
  });

  if (data[0]) {
    return data[0] as { id: string };
  }

  const {
    result: [salesChannel],
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

  return salesChannel;
}

async function ensureSingleVietnamStoreAndSalesChannel(
  container: MedusaContainer,
  query: any,
  salesChannelId: string,
) {
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    pagination: { take: 10000 },
  });

  if (products.length) {
    await linkProductsToSalesChannelWorkflow(container).run({
      input: {
        id: salesChannelId,
        add: products.map((product: { id: string }) => product.id),
      },
    });
  }

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "default_sales_channel_id"],
    pagination: { take: 100 },
  });
  let store =
    stores.find(
      (candidate: { default_sales_channel_id?: string | null }) =>
        candidate.default_sales_channel_id === salesChannelId,
    ) ??
    stores.find(
      (candidate: { name?: string | null }) =>
        candidate.name === "Tranh Tran Vien Vietnam",
    ) ??
    stores[0];

  if (store) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          name: "Tranh Tran Vien Vietnam",
          default_sales_channel_id: salesChannelId,
          supported_currencies: [
            {
              currency_code: "vnd",
              is_default: true,
            },
          ],
        },
      },
    });
  } else {
    const {
      result: [createdStore],
    } = await createStoresWorkflow(container).run({
      input: {
        stores: [
          {
            name: "Tranh Tran Vien Vietnam",
            supported_currencies: [
              {
                currency_code: "vnd",
                is_default: true,
              },
            ],
            default_sales_channel_id: salesChannelId,
          },
        ],
      },
    });
    store = createdStore;
  }

  const duplicateStoreIds = stores
    .filter((candidate: { id: string }) => candidate.id !== store?.id)
    .map((candidate: { id: string }) => candidate.id);

  if (duplicateStoreIds.length) {
    await deleteStoresWorkflow(container).run({
      input: { ids: duplicateStoreIds },
    });
  }

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    pagination: { take: 100 },
  });
  const duplicateSalesChannelIds = salesChannels
    .filter((candidate: { id: string }) => candidate.id !== salesChannelId)
    .map((candidate: { id: string }) => candidate.id);

  await migrateOpenCartsToSalesChannel(container, query, salesChannelId);

  if (duplicateSalesChannelIds.length) {
    await deleteSalesChannelsWorkflow(container).run({
      input: { ids: duplicateSalesChannelIds },
    });
  }
}

async function migrateOpenCartsToSalesChannel(
  container: MedusaContainer,
  query: any,
  salesChannelId: string,
) {
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "sales_channel_id", "completed_at"],
    pagination: { take: 10000 },
  });
  const carts = (data as {
    id: string;
    sales_channel_id?: string | null;
    completed_at?: Date | string | null;
  }[]).filter(
    (cart) => !cart.completed_at && cart.sales_channel_id !== salesChannelId,
  );

  for (const cart of carts) {
    await updateCartWorkflow(container).run({
      input: {
        id: cart.id,
        sales_channel_id: salesChannelId,
      },
    });
  }
}

async function getOrCreateVietnamRegion(
  container: MedusaContainer,
  query: any,
  paymentProviders: string[],
): Promise<{ id: string }> {
  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
    filters: { currency_code: "vnd" },
  });

  if (data[0]) {
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: data[0].id },
        update: {
          name: "Vietnam",
          payment_providers: paymentProviders,
        },
      },
    });
    return data[0] as { id: string };
  }

  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Vietnam",
          currency_code: "vnd",
          countries: ["vn"],
          payment_providers: paymentProviders,
        },
      ],
    },
  });

  if (!region) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Medusa did not return the Vietnam region",
    );
  }

  return region;
}

async function getOrCreateVietnamStockLocation(
  container: MedusaContainer,
  query: any,
): Promise<{ id: string }> {
  const { data } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    filters: { name: "Vietnam Warehouse" },
  });

  if (data[0]) {
    return data[0] as { id: string };
  }

  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
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

  if (!stockLocation) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Medusa did not return the Vietnam stock location",
    );
  }

  return stockLocation;
}

async function removeNonVietnamRegions(
  container: MedusaContainer,
  query: any,
  vietnamRegionId: string,
) {
  const { data } = await query.graph({
    entity: "region",
    fields: ["id"],
    pagination: { take: 100 },
  });
  const ids = (data as { id: string }[])
    .filter((region) => region.id !== vietnamRegionId)
    .map((region) => region.id);

  if (ids.length) {
    await deleteRegionsWorkflow(container).run({ input: { ids } });
  }
}

async function ensureVietnamShippingOption(input: {
  container: MedusaContainer;
  query: any;
  link: any;
  fulfillmentModuleService: any;
  stockLocation: { id: string };
  vietnamRegion: { id: string };
  storefrontCountries: string[];
}) {
  const { data: shippingOptions } = await input.query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
    pagination: { take: 100 },
  });

  if (shippingOptions.length) {
    return;
  }

  await input.link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: input.stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  const { data: shippingProfiles } = await input.query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfiles[0];

  if (!shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "No Medusa shipping profile exists",
    );
  }

  const fulfillmentSet =
    await input.fulfillmentModuleService.createFulfillmentSets({
      name: "Vietnam Warehouse delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Storefront delivery",
          geo_zones: input.storefrontCountries.map((country_code) => ({
            country_code,
            type: "country" as const,
          })),
        },
      ],
    });

  await input.link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: input.stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(input.container).run({
    input: [
      {
        name: "Giao hang tieu chuan",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Tieu chuan",
          description: "In theo don va giao hang tai Viet Nam.",
          code: "standard-vn",
        },
        prices: [
          {
            region_id: input.vietnamRegion.id,
            // eslint-disable-next-line @medusajs/prices-in-major-units
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
    ],
  });
}

async function getSingleVietnamPublishableKey(
  container: MedusaContainer,
  query: any,
): Promise<{ id: string; token: string }> {
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "title", "type", "revoked_at", "created_at"],
    filters: { type: "publishable" },
    pagination: { take: 100, order: { created_at: "ASC" } },
  });
  type ApiKeyRecord = {
    id: string;
    token: string;
    title: string;
    revoked_at?: Date | string | null;
  };
  const apiKeys = data as ApiKeyRecord[];
  let apiKey: ApiKeyRecord | undefined =
    apiKeys.find(
      (candidate) =>
        candidate.title === "Vietnam Storefront" && !candidate.revoked_at,
    ) ?? apiKeys.find((candidate) => !candidate.revoked_at);

  if (!apiKey) {
    const {
      result: [createdApiKey],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Vietnam Storefront",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    if (!createdApiKey) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Medusa did not return the created publishable API key"
      );
    }

    apiKey = createdApiKey;
  }

  const retainedApiKey = apiKey;

  const duplicateIds = apiKeys
    .filter((candidate) => candidate.id !== retainedApiKey.id)
    .map((candidate) => candidate.id);

  if (duplicateIds.length) {
    const activeDuplicateIds = apiKeys
      .filter(
        (candidate) =>
          candidate.id !== retainedApiKey.id && !candidate.revoked_at,
      )
      .map((candidate) => candidate.id);

    if (activeDuplicateIds.length) {
      await revokeApiKeysWorkflow(container).run({
        input: {
          selector: { id: activeDuplicateIds },
          revoke: { revoked_by: "seed" },
        },
      });
    }

    await deleteApiKeysWorkflow(container).run({
      input: { ids: duplicateIds },
    });
  }

  if (retainedApiKey.title !== "Vietnam Storefront") {
    const {
      result: [updatedApiKey],
    } = await updateApiKeysWorkflow(container).run({
      input: {
        selector: { id: retainedApiKey.id },
        update: { title: "Vietnam Storefront" },
      },
    });

    if (updatedApiKey) {
      return { id: updatedApiKey.id, token: updatedApiKey.token };
    }
  }

  return { id: retainedApiKey.id, token: retainedApiKey.token };
}
