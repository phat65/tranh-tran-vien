import {
  expandExploreTermIdsWithAutoAssignments,
  getMissingExploreDestinationProductIds,
  getExploreNavigationValidationError,
  readStoredExploreNavigation,
  resolveExploreNavigation,
} from "../../../../../../lib/explore-navigation"

const groups = [
  {
    code: "explore_shop_by_category",
    label: "Shop by Category",
    slug: "shop-by-category",
    taxonomy_id: "tax_category",
    metadata: {},
    terms: [
      {
        id: "term_anime",
        name: "Anime",
        slug: "shop-by-category-anime",
        status: "active" as const,
        metadata: { slug: "anime" },
      },
    ],
  },
  {
    code: "explore_popular_anime",
    label: "Popular Anime",
    slug: "popular-anime",
    taxonomy_id: "tax_popular_anime",
    metadata: {
      explore_navigation: {
        mode: "filter_tabs",
        target_term_id: "term_anime",
        auto_assign_target: true,
      },
    },
    terms: [
      {
        id: "term_dragon_ball",
        name: "Dragon Ball",
        slug: "popular-anime-dragon-ball",
        status: "active" as const,
        metadata: { slug: "dragon-ball" },
      },
    ],
  },
]

describe("Explore navigation configuration", () => {
  it("falls back to standalone for invalid metadata", () => {
    expect(
      readStoredExploreNavigation({
        explore_navigation: {
          mode: "filter_tabs",
          target_term_id: "",
        },
      })
    ).toEqual({ mode: "standalone" })
  })

  it("resolves the destination with public slugs", () => {
    expect(resolveExploreNavigation(groups[1], groups)).toEqual({
      mode: "filter_tabs",
      auto_assign_target: true,
      target: {
        heading_code: "explore_shop_by_category",
        heading_label: "Shop by Category",
        heading_slug: "shop-by-category",
        term_id: "term_anime",
        term_name: "Anime",
        term_slug: "anime",
      },
    })
  })

  it("automatically includes the configured destination term", () => {
    expect(
      expandExploreTermIdsWithAutoAssignments(
        ["term_dragon_ball"],
        groups
      )
    ).toEqual(["term_dragon_ball", "term_anime"])
  })

  it("backfills only products missing from the destination", () => {
    expect(
      getMissingExploreDestinationProductIds(
        ["prod_1", "prod_1", "prod_2", "prod_3"],
        ["prod_1", "prod_3"]
      )
    ).toEqual(["prod_2"])
  })

  it("rejects using a filter-tabs heading as another destination", () => {
    expect(
      getExploreNavigationValidationError({
        sourceGroup: groups[0],
        targetTermId: "term_dragon_ball",
        groups,
      })
    ).toBe("The destination heading must use standalone pages.")
  })
})
