"use client"

// Component giao diện xử lý phần item trong storefront.

import { Table, Text, clx } from "@modules/common/components/ui"
import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CustomLineItemThumbnail from "@modules/cart/components/custom-line-item-thumbnail"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    if (updating || quantity === item.quantity) {
      return
    }

    setError(null)
    setUpdating(true)

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  const fallbackMaxQuantity = 999
  const inventoryQuantity = Number(item.variant?.inventory_quantity)
  const maxQuantity =
    item.variant?.manage_inventory && Number.isFinite(inventoryQuantity)
      ? Math.max(1, inventoryQuantity)
      : fallbackMaxQuantity
  const customImageUrl = getCustomImageUrl(item)
  const customFilename = getCustomFilename(item)
  const customDisplayTitle = getCustomDisplayTitle(item)
  const productHref = customImageUrl
    ? "/custom/tranh-luc-giac"
    : `/products/${item.product_handle}`

  return (
    <Table.Row className="w-full" data-testid="product-row">
      <Table.Cell className="!pl-0 p-4 w-24">
        <LocalizedClientLink
          href={productHref}
          className={clx("flex", {
            "w-16": type === "preview",
            "small:w-24 w-12": type === "full",
          })}
        >
          {customImageUrl ? (
            <CustomLineItemThumbnail item={item} />
          ) : (
            <Thumbnail
              thumbnail={item.thumbnail}
              images={item.variant?.product?.images}
              size="square"
            />
          )}
        </LocalizedClientLink>
      </Table.Cell>

      <Table.Cell className="text-left">
        <Text
          className="txt-medium-plus text-ui-fg-base"
          data-testid="product-title"
        >
          {customDisplayTitle ?? item.product_title}
        </Text>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
        {customImageUrl && (
          <Text className="mt-1 text-xs text-ui-fg-muted">
            Custom image{customFilename ? `: ${customFilename}` : ""}
          </Text>
        )}
      </Table.Cell>

      {type === "full" && (
        <Table.Cell>
          <div className="flex items-center gap-2">
            <DeleteButton id={item.id} data-testid="product-delete-button" />
            <div
              className="grid h-10 w-28 grid-cols-[2.25rem_1fr_2.25rem] items-center overflow-hidden rounded-lg border border-ui-border-base bg-[#f2f0f1]"
              data-testid="product-quantity-stepper"
            >
              <button
                type="button"
                className="h-10 text-lg text-ui-fg-base disabled:text-ui-fg-disabled"
                onClick={() => changeQuantity(Math.max(1, item.quantity - 1))}
                disabled={updating || item.quantity <= 1}
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span
                className="flex h-10 items-center justify-center bg-white text-sm font-semibold"
                data-testid="product-quantity"
                data-value={item.quantity}
              >
                {item.quantity}
              </span>
              <button
                type="button"
                className="h-10 text-lg text-ui-fg-base disabled:text-ui-fg-disabled"
                onClick={() =>
                  changeQuantity(Math.min(maxQuantity, item.quantity + 1))
                }
                disabled={updating || item.quantity >= maxQuantity}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            {updating && <Spinner />}
          </div>
          <ErrorMessage error={error} data-testid="product-error-message" />
        </Table.Cell>
      )}

      {type === "full" && (
        <Table.Cell className="hidden small:table-cell">
          <LineItemUnitPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </Table.Cell>
      )}

      <Table.Cell className="!pr-0">
        <span
          className={clx("!pr-0", {
            "flex flex-col items-end h-full justify-center": type === "preview",
          })}
        >
          {type === "preview" && (
            <span className="flex gap-x-1 ">
              <Text className="text-ui-fg-muted">{item.quantity}x </Text>
              <LineItemUnitPrice
                item={item}
                style="tight"
                currencyCode={currencyCode}
              />
            </span>
          )}
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

function getCustomImageUrl(item: HttpTypes.StoreCartLineItem) {
  const value = item.metadata?.ttv_custom_image_url

  return typeof value === "string" && value ? value : null
}

function getCustomFilename(item: HttpTypes.StoreCartLineItem) {
  const value = item.metadata?.ttv_custom_original_filename

  return typeof value === "string" && value ? value : null
}

function getCustomDisplayTitle(item: HttpTypes.StoreCartLineItem) {
  const value = item.metadata?.ttv_custom_display_title

  return typeof value === "string" && value ? value : null
}

export default Item
