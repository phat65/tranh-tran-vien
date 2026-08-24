export const getPayOSCheckoutUrl = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  try {
    const url = new URL(value)

    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}
