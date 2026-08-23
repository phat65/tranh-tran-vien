import {
  exposeNativeQuantityRulesToDashboard,
  normalizePriceListQuantityRules,
  normalizePriceQuantityRules,
} from "../price-list-quantity"

describe("price-list quantity normalization", () => {
  it("moves dashboard quantity rules to native price fields", () => {
    const body = {
      create: [
        {
          amount: 225000,
          rules: {
            region_id: "reg_vietnam",
            min_quantity: "2",
            max_quantity: "2",
          },
        },
      ],
      update: [
        {
          id: "price_1",
          rules: {
            min_quantity: "3",
          },
        },
      ],
    }

    expect(normalizePriceListQuantityRules(body)).toBe(2)
    expect(body.create[0]).toEqual({
      amount: 225000,
      min_quantity: 2,
      max_quantity: 2,
      rules: { region_id: "reg_vietnam" },
    })
    expect(body.update[0]).toEqual({
      id: "price_1",
      min_quantity: 3,
    })
  })

  it("keeps an explicit native quantity value", () => {
    const price = {
      min_quantity: null,
      rules: { min_quantity: "3", region_id: "reg_vietnam" },
    }

    expect(normalizePriceQuantityRules(price)).toBe(true)
    expect(price).toEqual({
      min_quantity: null,
      rules: { region_id: "reg_vietnam" },
    })
  })

  it("rejects invalid quantities instead of silently storing a broken rule", () => {
    expect(() =>
      normalizePriceQuantityRules({ rules: { min_quantity: "2.5" } })
    ).toThrow("min_quantity must be a positive integer")
  })

  it("mirrors native quantities into a price-list detail response", () => {
    const response = {
      price_list: {
        prices: [
          {
            id: "price_1",
            min_quantity: 3,
            max_quantity: 4,
            rules: { region_id: "reg_vietnam" },
          },
        ],
      },
    }

    exposeNativeQuantityRulesToDashboard(response)

    expect(response.price_list.prices[0].rules).toEqual({
      region_id: "reg_vietnam",
      min_quantity: "3",
      max_quantity: "4",
    })
  })

  it("supports the standalone Admin price-list prices response", () => {
    const response: { prices: Array<Record<string, unknown>> } = {
      prices: [
        {
          id: "price_2",
          min_quantity: { value: "5" },
          max_quantity: null,
          price_rules: [
            { attribute: "region_id", value: "reg_vietnam" },
          ],
        },
      ],
    }

    exposeNativeQuantityRulesToDashboard(response)

    expect(response.prices[0].rules).toEqual({
      region_id: "reg_vietnam",
      min_quantity: "5",
    })
  })
})
