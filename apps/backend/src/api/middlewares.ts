// Backend middleware for API body size and project-specific request shaping.

import {
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products",
      methods: ["POST"],
      middlewares: [forceMadeToOrderInventory],
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
      matcher: "/admin/uploads/*",
      methods: ["POST"],
      bodyParser: {
        sizeLimit: "50mb",
      },
    },
    {
      matcher: "/admin/tranh-tran-vien/catalog/explore/product-images",
      methods: ["POST"],
      bodyParser: {
        sizeLimit: "50mb",
      },
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
