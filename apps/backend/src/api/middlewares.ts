// Backend middleware for API body size and project-specific request shaping.

import { validateAndTransformQuery } from "@medusajs/framework"
import {
  applyDefaultFilters,
  authenticate,
  clearFiltersByKey,
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  maybeApplyLinkFilter,
} from "@medusajs/framework/http"
import { ProductStatus } from "@medusajs/framework/utils"
import {
  filterByValidSalesChannels,
  normalizeDataForContext,
  setPricingContext,
  setTaxContext,
} from "@medusajs/medusa/api/utils/middlewares/index"

import { listImageProductQueryConfig } from "./store/image-products/query-config"
import { StoreGetImageProductsParams } from "./store/image-products/validators"
import { StoreGetQuantityPricesParams } from "./store/quantity-prices/validators"
import { canonicalizeImageProductLineMetadata } from "../lib/image-product-cart"
import {
  exposeNativeQuantityRulesToDashboard,
  normalizePriceListQuantityRules,
} from "../lib/price-list-quantity"
import { preventDuplicateProductCreate } from "./admin/products/prevent-duplicate-create"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products",
      methods: ["POST"],
      middlewares: [preventDuplicateProductCreate, forceMadeToOrderInventory],
    },
    {
      matcher: "/admin/products/*",
      methods: ["POST"],
      middlewares: [forceMadeToOrderInventory],
    },
    {
      matcher: "/admin/inventory-items",
      methods: ["POST"],
      middlewares: [blockInventoryWrites],
    },
    {
      matcher: "/admin/inventory-items/*",
      methods: ["POST"],
      middlewares: [blockInventoryWrites],
    },
    {
      matcher: "/admin/uploads",
      methods: ["POST"],
      bodyParser: {
        sizeLimit: "50mb",
      },
    },
    {
      matcher: "/admin/price-lists/*/prices/batch",
      methods: ["POST"],
      middlewares: [normalizePriceListQuantityPayload],
    },
    {
      matcher: "/admin/price-lists/*",
      methods: ["GET"],
      middlewares: [exposePriceListQuantityRules],
    },
    {
      matcher: "/admin/uploads/*",
      methods: ["POST"],
      bodyParser: {
        sizeLimit: "50mb",
      },
    },
    {
      matcher: "/admin/tranh-tran-vien/catalog/product-images",
      methods: ["POST"],
      bodyParser: {
        sizeLimit: "50mb",
      },
    },
    {
      matcher: "/store/image-products",
      methods: ["GET"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
        validateAndTransformQuery(
          StoreGetImageProductsParams,
          listImageProductQueryConfig
        ),
        filterByValidSalesChannels(),
        maybeApplyLinkFilter({
          entryPoint: "product_sales_channel",
          resourceId: "product_id",
          filterableField: "sales_channel_id",
        }),
        applyDefaultFilters({
          status: ProductStatus.PUBLISHED,
          categories: (filters) => {
            const categoryIds = filters.category_id
            delete filters.category_id

            if (!categoryIds) {
              return
            }

            return {
              id: categoryIds,
              is_internal: false,
              is_active: true,
            }
          },
        }),
        normalizeDataForContext(),
        setPricingContext(),
        setTaxContext(),
        clearFiltersByKey(["region_id", "country_code", "province", "cart_id"]),
      ],
    },
    {
      matcher: "/store/quantity-prices",
      methods: ["GET"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
        validateAndTransformQuery(StoreGetQuantityPricesParams, {
          defaults: ["calculated_price.*"],
          isList: true,
        }),
        normalizeDataForContext(),
        setPricingContext({ priceFieldPaths: ["calculated_price"] }),
        clearFiltersByKey(["region_id", "country_code", "province", "cart_id"]),
      ],
    },
    {
      matcher: "/store/carts/*/line-items",
      methods: ["POST"],
      middlewares: [canonicalizeImageProductLineItem],
    },
    {
      matcher: "/store/tranh-tran-vien/custom-wall/uploads",
      methods: ["POST"],
      bodyParser: {
        sizeLimit: "12mb",
      },
    },
  ],
})

function normalizePriceListQuantityPayload(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    normalizePriceListQuantityRules(req.body)
    next()
  } catch (error) {
    next(error)
  }
}

function exposePriceListQuantityRules(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const sendJson = res.json.bind(res)

  res.json = ((body: unknown) => {
    exposeNativeQuantityRulesToDashboard(body)
    return sendJson(body)
  }) as typeof res.json

  next()
}

function forceMadeToOrderInventory(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const path = getRequestPath(req)

  if (path.includes("/variants/inventory-items")) {
    disableInventoryItemBatch(req.body)
    return next()
  }

  if (path.includes("/variants/batch")) {
    forceVariantBatchPayload(req.body)
    return next()
  }

  if (path.includes("/variants")) {
    forceVariantPayload(req.body)
    return next()
  }

  forceProductPayload(req.body)
  next()
}

async function canonicalizeImageProductLineItem(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    if (!isRecord(req.body)) {
      return next()
    }

    const variantId =
      typeof req.body.variant_id === "string" ? req.body.variant_id : ""
    const metadata = isRecord(req.body.metadata) ? req.body.metadata : null

    if (!variantId || !metadata) {
      return next()
    }

    req.body.metadata = await canonicalizeImageProductLineMetadata({
      scope: req.scope,
      variantId,
      metadata,
    })
    next()
  } catch (error) {
    next(error)
  }
}

function blockInventoryWrites(
  _req: MedusaRequest,
  res: MedusaResponse,
  _next: MedusaNextFunction
) {
  res.status(400).json({
    message:
      "Inventory is disabled for made-to-order printed art. Upload/select artwork instead of managing stock.",
  })
}

function getRequestPath(req: MedusaRequest) {
  const request = req as unknown as {
    path?: string
    originalUrl?: string
    url?: string
  }
  const candidate = request.path ?? request.originalUrl ?? request.url ?? ""

  return candidate.split("?")[0]
}

function forceProductPayload(body: unknown) {
  if (!isRecord(body)) {
    return
  }

  if (Array.isArray(body.variants)) {
    body.variants.forEach(forceVariantPayload)
  }

  if (Array.isArray(body.create)) {
    body.create.forEach(forceProductPayload)
  }

  if (Array.isArray(body.update)) {
    body.update.forEach(forceProductPayload)
  }
}

function forceVariantBatchPayload(body: unknown) {
  if (!isRecord(body)) {
    return
  }

  if (Array.isArray(body.create)) {
    body.create.forEach(forceVariantPayload)
  }

  if (Array.isArray(body.update)) {
    body.update.forEach(forceVariantPayload)
  }
}

function forceVariantPayload(body: unknown) {
  if (!isRecord(body)) {
    return
  }

  body.manage_inventory = false
  body.allow_backorder = true
  delete body.inventory_items
}

function disableInventoryItemBatch(body: unknown) {
  if (!isRecord(body)) {
    return
  }

  body.create = []
  body.update = []
  body.delete = []
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
