import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"

type OrderWidgetProps = {
  data?: {
    items?: OrderLineItem[]
  }
}

type OrderLineItem = {
  id: string
  title?: string | null
  product_title?: string | null
  metadata?: Record<string, unknown> | null
}

type ExploreSelection = {
  lineItemId: string
  productTitle: string
  groupLabel: string
  itemName: string
  imageId: string
  imageName: string
  imageCode: string
  imageUrl: string
  filename: string
}

const TtvOrderExploreSelectionWidget = ({ data }: OrderWidgetProps) => {
  const selections = (data?.items ?? [])
    .map(getExploreSelection)
    .filter((selection): selection is ExploreSelection => Boolean(selection))

  if (!selections.length) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Made-to-order image products</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          Image IDs and codes are stored on the order line item metadata.
        </Text>
      </div>
      <div className="grid gap-3 p-6">
        {selections.map((selection) => (
          <div
            key={selection.lineItemId}
            className="grid grid-cols-[72px_1fr] gap-3 rounded-rounded border border-ui-border-base p-3"
          >
            <img
              src={selection.imageUrl}
              alt={selection.imageCode}
              className="h-[72px] w-[72px] rounded-rounded object-cover"
            />
            <div className="grid content-center gap-1">
              <Text size="small" weight="plus">
                {selection.imageName}
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Album: {selection.productTitle}
              </Text>
              {selection.groupLabel || selection.itemName ? (
                <Text size="small" className="text-ui-fg-subtle">
                  Explore: {[selection.groupLabel, selection.itemName]
                    .filter(Boolean)
                    .join(" / ")}
                </Text>
              ) : null}
              <Text size="small">
                Selected Image:{" "}
                <span className="font-semibold">{selection.imageCode}</span>
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                Image ID: {selection.imageId}
              </Text>
              {selection.filename ? (
                <Text size="xsmall" className="text-ui-fg-subtle">
                  Filename: {selection.filename}
                </Text>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Container>
  )
}

function getExploreSelection(item: OrderLineItem): ExploreSelection | null {
  const metadata = item.metadata
  const imageId = getString(metadata?.ttv_explore_image_id)
  const imageCode = getString(metadata?.ttv_explore_image_code)
  const imageUrl = getString(metadata?.ttv_explore_image_url)

  if (!imageId || !imageCode || !imageUrl) {
    return null
  }

  return {
    lineItemId: item.id,
    productTitle: item.product_title ?? item.title ?? "Product",
    groupLabel: getString(metadata?.ttv_explore_group_label) ?? "Explore",
    itemName: getString(metadata?.ttv_explore_item_name) ?? "",
    imageId,
    imageName:
      getString(metadata?.ttv_explore_image_name) ?? imageCode,
    imageCode,
    imageUrl,
    filename: getString(metadata?.ttv_explore_original_filename) ?? "",
  }
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
  id: "ttv-order-explore-selection",
})

export default TtvOrderExploreSelectionWidget
