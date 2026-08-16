import { planBulkExploreAssignment } from "../bulk-assignment"

describe("planBulkExploreAssignment", () => {
  it("adds only missing assignments and preserves unrelated links", () => {
    const plan = planBulkExploreAssignment({
      action: "add",
      productIds: ["prod_1", "prod_2"],
      termId: "term_anime",
      existingLinks: [
        {
          id: "link_existing",
          product_id: "prod_1",
          term_id: "term_anime",
        },
        {
          id: "link_shape",
          product_id: "prod_2",
          term_id: "term_hexagon",
        },
      ],
    })

    expect(plan.linksToCreate).toEqual([
      { product_id: "prod_2", term_id: "term_anime" },
    ])
    expect(plan.linkIdsToDelete).toEqual([])
    expect(plan.updatedProductIds).toEqual(["prod_2"])
    expect(plan.unchangedProductIds).toEqual(["prod_1"])
  })

  it("adds an automatic destination assignment without duplicating links", () => {
    const plan = planBulkExploreAssignment({
      action: "add",
      productIds: ["prod_1", "prod_2"],
      termId: "term_dragon_ball",
      additionalTermIdsToAdd: ["term_anime"],
      existingLinks: [
        {
          id: "link_dragon_ball_1",
          product_id: "prod_1",
          term_id: "term_dragon_ball",
        },
        {
          id: "link_anime_1",
          product_id: "prod_1",
          term_id: "term_anime",
        },
      ],
    })

    expect(plan.linksToCreate).toEqual([
      { product_id: "prod_2", term_id: "term_dragon_ball" },
      { product_id: "prod_2", term_id: "term_anime" },
    ])
    expect(plan.updatedProductIds).toEqual(["prod_2"])
    expect(plan.unchangedProductIds).toEqual(["prod_1"])
  })

  it("removes only the selected item", () => {
    const plan = planBulkExploreAssignment({
      action: "remove",
      productIds: ["prod_1"],
      termId: "term_anime",
      existingLinks: [
        {
          id: "link_anime",
          product_id: "prod_1",
          term_id: "term_anime",
        },
        {
          id: "link_shape",
          product_id: "prod_1",
          term_id: "term_hexagon",
        },
      ],
    })

    expect(plan.linksToCreate).toEqual([])
    expect(plan.linkIdsToDelete).toEqual(["link_anime"])
    expect(plan.updatedProductIds).toEqual(["prod_1"])
  })

  it("moves products while keeping all unrelated assignments", () => {
    const plan = planBulkExploreAssignment({
      action: "move",
      productIds: ["prod_1", "prod_2"],
      sourceTermId: "term_old",
      termId: "term_new",
      existingLinks: [
        {
          id: "link_old_1",
          product_id: "prod_1",
          term_id: "term_old",
        },
        {
          id: "link_new_2",
          product_id: "prod_2",
          term_id: "term_new",
        },
        {
          id: "link_shape",
          product_id: "prod_1",
          term_id: "term_hexagon",
        },
      ],
    })

    expect(plan.linksToCreate).toEqual([
      { product_id: "prod_1", term_id: "term_new" },
    ])
    expect(plan.linkIdsToDelete).toEqual(["link_old_1"])
    expect(plan.updatedProductIds).toEqual(["prod_1"])
    expect(plan.unchangedProductIds).toEqual(["prod_2"])
  })

  it("keeps the source when it is required by the destination", () => {
    const plan = planBulkExploreAssignment({
      action: "move",
      productIds: ["prod_1"],
      sourceTermId: "term_anime",
      termId: "term_dragon_ball",
      additionalTermIdsToAdd: ["term_anime"],
      existingLinks: [
        {
          id: "link_anime",
          product_id: "prod_1",
          term_id: "term_anime",
        },
      ],
    })

    expect(plan.linksToCreate).toEqual([
      { product_id: "prod_1", term_id: "term_dragon_ball" },
    ])
    expect(plan.linkIdsToDelete).toEqual([])
    expect(plan.updatedProductIds).toEqual(["prod_1"])
  })

  it("is idempotent when every product already has the requested state", () => {
    const addPlan = planBulkExploreAssignment({
      action: "add",
      productIds: ["prod_1"],
      termId: "term_anime",
      existingLinks: [
        {
          id: "link_anime",
          product_id: "prod_1",
          term_id: "term_anime",
        },
      ],
    })
    const removePlan = planBulkExploreAssignment({
      action: "remove",
      productIds: ["prod_1"],
      termId: "term_missing",
      existingLinks: [],
    })

    expect(addPlan.updatedProductIds).toEqual([])
    expect(addPlan.unchangedProductIds).toEqual(["prod_1"])
    expect(removePlan.updatedProductIds).toEqual([])
    expect(removePlan.unchangedProductIds).toEqual(["prod_1"])
  })

  it("rejects a move to the same item", () => {
    expect(() =>
      planBulkExploreAssignment({
        action: "move",
        productIds: ["prod_1"],
        sourceTermId: "term_anime",
        termId: "term_anime",
        existingLinks: [],
      })
    ).toThrow("Source and destination Explore items must be different.")
  })
})
