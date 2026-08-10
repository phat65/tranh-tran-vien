// API storefront cung cấp dữ liệu public cho tranh tran vien / custom wall / uploads.

import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

type UploadPayload = {
  filename?: unknown
  mime_type?: unknown
  data_url?: unknown
}

export async function POST(
  req: MedusaRequest<UploadPayload>,
  res: MedusaResponse
): Promise<void> {
  const filename = typeof req.body.filename === "string" ? req.body.filename : ""
  const mimeType =
    typeof req.body.mime_type === "string" ? req.body.mime_type : ""
  const dataUrl = typeof req.body.data_url === "string" ? req.body.data_url : ""

  if (!filename || !mimeType || !dataUrl) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "filename, mime_type, and data_url are required"
    )
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Only JPG, PNG, and WebP images are supported"
    )
  }

  const fileBuffer = parseDataUrl(dataUrl, mimeType)

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Image must be 8 MB or smaller"
    )
  }

  const extension = getExtension(filename, mimeType)
  const storedFilename = `${Date.now()}-${randomUUID()}${extension}`
  const uploadDir = path.join(process.cwd(), "static", "custom-wall-uploads")
  const filePath = path.join(uploadDir, storedFilename)

  await mkdir(uploadDir, { recursive: true })
  await writeFile(filePath, fileBuffer)

  res.status(200).json({
    url: `/static/custom-wall-uploads/${storedFilename}`,
    filename,
    mime_type: mimeType,
    size: fileBuffer.length,
  })
}

function parseDataUrl(dataUrl: string, expectedMimeType: string): Buffer {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)

  if (!match || match[1] !== expectedMimeType) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid image data"
    )
  }

  return Buffer.from(match[2], "base64")
}

function getExtension(filename: string, mimeType: string) {
  const extension = path.extname(filename.toLowerCase())

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return extension
  }

  if (mimeType === "image/png") {
    return ".png"
  }

  if (mimeType === "image/webp") {
    return ".webp"
  }

  return ".jpg"
}
