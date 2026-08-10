// Helper backend xử lý static assets dùng lại giữa API, module và script.

const DEFAULT_BACKEND_URL = "http://localhost:9000"

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "")
}

function trimStaticSuffix(value: string) {
  return trimTrailingSlashes(value).replace(/\/static$/, "")
}

export function getStaticAssetBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const explicitStaticUrl = env.MEDUSA_STATIC_ASSET_URL

  if (explicitStaticUrl) {
    return trimTrailingSlashes(explicitStaticUrl)
  }

  const backendUrl = env.MEDUSA_BACKEND_URL ?? DEFAULT_BACKEND_URL

  return `${trimStaticSuffix(backendUrl)}/static`
}
