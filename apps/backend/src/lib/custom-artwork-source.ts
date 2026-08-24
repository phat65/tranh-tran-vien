import { getStaticAssetBaseUrl } from "./static-assets"

export function resolveCustomArtworkSourceUrl(
  value: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null
  }

  const source = value.trim()
  const allowedBase = toHttpUrl(getStaticAssetBaseUrl(env))

  if (!allowedBase) {
    return null
  }

  const candidate = source.startsWith("/")
    ? toHttpUrl(source, allowedBase.origin)
    : toHttpUrl(source)

  if (!candidate || candidate.username || candidate.password) {
    return null
  }

  const allowedPath = allowedBase.pathname.replace(/\/+$/, "")
  const isAllowedPath =
    candidate.pathname === allowedPath ||
    candidate.pathname.startsWith(`${allowedPath}/`)

  if (candidate.origin !== allowedBase.origin || !isAllowedPath) {
    return null
  }

  candidate.hash = ""

  return candidate.toString()
}

function toHttpUrl(value: string, base?: string) {
  try {
    const url = base ? new URL(value, base) : new URL(value)

    return url.protocol === "http:" || url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}
