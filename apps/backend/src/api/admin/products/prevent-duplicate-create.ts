import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  deleteUnusedFilesByUrl,
  FileModuleWriteService,
  ProductImageLookupService,
} from "../../../lib/product-image-storage"
import { getStaticAssetBaseUrl } from "../../../lib/static-assets"

const DUPLICATE_WINDOW_MS = 5 * 60 * 1000
const titlesInFlight = new Set<string>()

type CreateProductBody = {
  title?: string
  thumbnail?: string | null
  images?: { url?: string }[]
}

export async function preventDuplicateProductCreate(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = req.body as CreateProductBody | undefined
  const title = body?.title?.trim()

  if (!title) {
    return next()
  }

  const titleKey = title.toLocaleLowerCase()
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (titlesInFlight.has(titleKey)) {
    return rejectDuplicate(req, res, logger, body)
  }

  const productService = req.scope.resolve(Modules.PRODUCT)
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
  const recentMatches = await productService.listProducts({
    title,
    created_at: { $gte: since },
  })

  if (recentMatches.length) {
    return rejectDuplicate(req, res, logger, body)
  }

  titlesInFlight.add(titleKey)
  const release = () => titlesInFlight.delete(titleKey)
  res.once("finish", release)
  res.once("close", release)

  return next()
}

async function rejectDuplicate(
  req: MedusaRequest,
  res: MedusaResponse,
  logger: Logger,
  body: CreateProductBody | undefined
) {
  const candidateUrls = [
    body?.thumbnail ?? undefined,
    ...(body?.images?.map((image) => image.url) ?? []),
  ].filter((url): url is string => Boolean(url))

  if (candidateUrls.length) {
    try {
      await deleteUnusedFilesByUrl(
        candidateUrls,
        req.scope.resolve(
          Modules.PRODUCT
        ) as unknown as ProductImageLookupService,
        req.scope.resolve(Modules.FILE) as unknown as FileModuleWriteService,
        getStaticAssetBaseUrl()
      )
    } catch (error) {
      logger.warn(
        `Failed to clean duplicate product uploads: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  return res.status(409).json({
    type: "duplicate_request",
    message:
      "A product with this title was just created. The duplicate request was discarded; refresh the product list instead.",
  })
}
