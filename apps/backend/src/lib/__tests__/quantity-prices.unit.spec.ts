import {
  getDiscountPercentage,
  toNumericAmount,
} from "../quantity-prices"

describe("native quantity price projection", () => {
  it.each([
    [250_000, 225_000, 10],
    [250_000, 212_500, 15],
  ])(
    "derives the display discount from %s to %s",
    (originalAmount, amount, expected) => {
      expect(getDiscountPercentage(originalAmount, amount)).toBe(expected)
    }
  )

  it("does not label an equal or higher price as a discount", () => {
    expect(getDiscountPercentage(250_000, 250_000)).toBeNull()
    expect(getDiscountPercentage(250_000, 275_000)).toBeNull()
  })

  it("normalizes Medusa numeric values without trusting invalid input", () => {
    expect(toNumericAmount("212500")).toBe(212_500)
    expect(toNumericAmount(null)).toBeNull()
    expect(toNumericAmount("not-a-price")).toBeNull()
  })
})
