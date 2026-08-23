// Helper backend xử lý static assets dùng lại giữa API, module và script.

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "")
}

export function getStaticAssetBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const storagePublicUrl = env.S3_PUBLIC_BASE_URL ?? env.S3_FILE_URL

  if (storagePublicUrl) {
    return trimTrailingSlashes(storagePublicUrl)
  }

  const backendUrl = env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"

  return `${trimTrailingSlashes(backendUrl)}/static`
}
