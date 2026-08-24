type LineItemWithMetadata = {
  metadata?: Record<string, unknown> | null
}

export function getImageProductDisplayImageUrl(
  item: LineItemWithMetadata
): string | null {
  const canonicalUrl = getNonEmptyString(item.metadata?.ttv_display_image_url)

  if (canonicalUrl) {
    return canonicalUrl
  }

  return getNonEmptyString(item.metadata?.ttv_explore_image_url)
}

function getNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}
