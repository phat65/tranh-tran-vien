import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { resolveCustomArtworkSourceUrl } from "../../../../../lib/custom-artwork-source"

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_SOURCE_SIZE_BYTES = 10 * 1024 * 1024

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const sourceUrl = resolveCustomArtworkSourceUrl(req.query.url)

  if (!sourceUrl) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The artwork source URL is not allowed",
    )
  }

  let sourceResponse: Response

  try {
    sourceResponse = await fetch(sourceUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Could not load the original artwork",
    )
  }

  if (!sourceResponse.ok) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "The original artwork could not be found",
    )
  }

  const contentType = sourceResponse.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase()

  if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The artwork source is not a supported image",
    )
  }

  const contentLength = Number(sourceResponse.headers.get("content-length"))

  if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_SIZE_BYTES) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The artwork source is too large",
    )
  }

  const sourceBuffer = Buffer.from(await sourceResponse.arrayBuffer())

  if (sourceBuffer.length > MAX_SOURCE_SIZE_BYTES) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The artwork source is too large",
    )
  }

  res.setHeader("Content-Type", contentType)
  res.setHeader("Cache-Control", "private, max-age=300")
  res.status(200).send(sourceBuffer)
}
