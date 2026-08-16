export type CatalogProductSeed = {
  title: string
  handle: string
  sku: string
  imagePath: string
  uploadFileName?: string
}

export type CatalogProductExploreSeed = {
  headingCode: string
  headingLabel: string
  headingSlug: string
  itemName: string
  itemSlug: string
  productHandles: string[]
}

export type CatalogExploreNavigationSeed = {
  sourceHeadingCode: string
  targetHeadingCode: string
  targetItemSlug: string
  autoAssignTarget: boolean
}
