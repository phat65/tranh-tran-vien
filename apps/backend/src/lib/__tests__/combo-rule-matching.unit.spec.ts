import {
  getComboRuleMatchingQuantity,
  matchesComboRuleScope,
} from "../combo-rule-matching"

describe("combo rule Explore matching", () => {
  const hexagonRule = {
    scope_type: "taxonomy" as const,
    taxonomy_term_id: "term_hexagon",
  }

  it("matches a product assigned to the selected Explore item", () => {
    expect(
      matchesComboRuleScope(hexagonRule, {
        taxonomy_term_ids: ["term_anime", "term_hexagon"],
      })
    ).toBe(true)
  })

  it("does not match a product from another Explore item", () => {
    expect(
      matchesComboRuleScope(hexagonRule, {
        taxonomy_term_ids: ["term_classic"],
      })
    ).toBe(false)
  })

  it("counts quantities only from matching cart lines", () => {
    expect(
      getComboRuleMatchingQuantity(hexagonRule, [
        { quantity: "2", taxonomy_term_ids: ["term_hexagon"] },
        { quantity: 1, taxonomy_term_ids: ["term_classic"] },
        { quantity: 3, taxonomy_term_ids: ["term_hexagon"] },
      ])
    ).toBe(5)
  })
})
