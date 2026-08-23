export function toNumericAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function getDiscountPercentage(
  originalAmount: number | null,
  amount: number
): number | null {
  if (!originalAmount || originalAmount <= amount) {
    return null
  }

  return Math.round(((originalAmount - amount) / originalAmount) * 10000) / 100
}
