// Helper backend xử lý static assets dùng lại giữa API, module và script.

import { MedusaError } from "@medusajs/framework/utils"

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "")
}

export function getStaticAssetBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const storagePublicUrl = env.S3_PUBLIC_BASE_URL ?? env.S3_FILE_URL

  if (storagePublicUrl) {
    return trimTrailingSlashes(storagePublicUrl)
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "S3_PUBLIC_BASE_URL or S3_FILE_URL is required for catalog image URLs"
  )
}
