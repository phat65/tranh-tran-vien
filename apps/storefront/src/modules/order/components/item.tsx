// Component giao diện xử lý phần item trong storefront.

import { HttpTypes } from "@medusajs/types"
import { Table, Text } from "@modules/common/components/ui"

import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
}

const Item = ({ item, currencyCode }: ItemProps) => {
  return (
    <Table.Row className="w-full" data-testid="product-row">
      <Table.Cell className="!pl-0 p-4 w-24">
        <div className="flex w-16">
          <Thumbnail thumbnail={item.thumbnail} size="square" />
        </div>
      </Table.Cell>

      <Table.Cell className="text-left">
        <Text
          className="txt-medium-plus text-ui-fg-base"
          data-testid="product-name"
        >
          {item.product_title}
        </Text>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
        {getExploreImageSelection(item) ? (
          <ExploreSelection item={item} />
        ) : null}
      </Table.Cell>

      <Table.Cell className="!pr-0">
        <span className="!pr-0 flex flex-col items-end h-full justify-center">
          <span className="flex gap-x-1 ">
            <Text className="text-ui-fg-muted">
              <span data-testid="product-quantity">{item.quantity}</span>x{" "}
            </Text>
            <LineItemUnitPrice
              item={item}
              style="tight"
              currencyCode={currencyCode}
            />
          </span>

          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </span>
      </Table.Cell>
    </Table.Row>
  )
}

function ExploreSelection({
  item,
}: {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
}) {
  const selection = getExploreImageSelection(item)

  if (!selection) {
    return null
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <img
        src={selection.url}
        alt={selection.code}
        className="h-10 w-10 rounded border border-ui-border-base object-cover"
      />
      <Text className="text-xs text-ui-fg-muted">
        {selection.group} / {selection.item}:{" "}
        <span className="font-semibold text-ui-fg-base">{selection.code}</span>
        {selection.filename ? ` (${selection.filename})` : ""}
      </Text>
    </div>
  )
}

function getExploreImageSelection(
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
) {
  const metadata = item.metadata
  const code = metadata?.ttv_explore_image_code
  const url = metadata?.ttv_explore_image_url

  if (typeof code !== "string" || typeof url !== "string") {
    return null
  }

  return {
    code,
    url,
    filename:
      typeof metadata?.ttv_explore_original_filename === "string"
        ? metadata.ttv_explore_original_filename
        : "",
    group:
      typeof metadata?.ttv_explore_group_label === "string"
        ? metadata.ttv_explore_group_label
        : "Explore",
    item:
      typeof metadata?.ttv_explore_item_name === "string"
        ? metadata.ttv_explore_item_name
        : "",
  }
}

export default Item
