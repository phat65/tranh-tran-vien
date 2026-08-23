"use client"

// Component giao diện xử lý phần product actions trong storefront.

import { useIntersection } from "@lib/hooks/use-in-view"
import type { StoreQuantityPrice } from "@lib/data/quantity-prices"
import { HttpTypes } from "@medusajs/types"
import type { TtvSelectedExploreImage } from "@lib/data/ttv-explore"
import { Button, Text, clx } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import QuantityPriceList from "@modules/products/components/quantity-price-list"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  quantityPrices?: StoreQuantityPrice[]
  addToCartAction?: AddToCartAction
  selectedExploreImage?: TtvSelectedExploreImage | null
}

type AddToCartAction = (input: {
  variantId: string
  quantity: number
  countryCode: string
  metadata?: Record<string, unknown>
}) => Promise<void>

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  region,
  disabled,
  quantityPrices = [],
  addToCartAction,
  selectedExploreImage,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(() =>
    parseQuantity(searchParams.get("qty"))
  )
  const [isAdding, setIsAdding] = useState(false)
  const [addToCartError, setAddToCartError] = useState<string | null>(null)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  const inStock = useMemo(() => {
    return Boolean(selectedVariant)
  }, [selectedVariant])

  const addToCartLabel = useMemo(() => {
    if (!selectedVariant || !isValidVariant) {
      return "Select variant"
    }

    return "Add to cart"
  }, [isValidVariant, selectedVariant])

  const selectedQuantityPrices = useMemo(
    () =>
      quantityPrices.filter(
        (price) => price.variant_id === selectedVariant?.id
      ),
    [quantityPrices, selectedVariant?.id]
  )

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id || !addToCartAction) return null

    setIsAdding(true)
    setAddToCartError(null)

    try {
      await addToCartAction({
        variantId: selectedVariant.id,
        quantity,
        countryCode,
        metadata: selectedExploreImage
          ? {
              ttv_source: "explore_image",
              ttv_explore_group_code: selectedExploreImage.explore_group_code,
              ttv_explore_group_label: selectedExploreImage.explore_group_label,
              ttv_explore_group_slug: selectedExploreImage.explore_group_slug,
              ttv_explore_item_id: selectedExploreImage.explore_item_id,
              ttv_explore_item_name: selectedExploreImage.explore_item_name,
              ttv_explore_item_slug: selectedExploreImage.explore_item_slug,
              ttv_explore_image_id: selectedExploreImage.image_id,
              ttv_explore_image_code: selectedExploreImage.code,
              ttv_explore_image_url: selectedExploreImage.url,
              ttv_explore_image_name:
                selectedExploreImage.title ?? selectedExploreImage.code,
              ttv_explore_image_alt: selectedExploreImage.alt ?? "",
              ttv_image_product_handle: selectedExploreImage.handle ?? "",
              ttv_virtual_product_id:
                selectedExploreImage.virtual_product_id ?? "",
              ttv_parent_product_id:
                selectedExploreImage.parent_product_id ?? product.id,
              ttv_parent_product_handle:
                selectedExploreImage.parent_product_handle ?? product.handle,
              ttv_explore_original_filename:
                selectedExploreImage.original_filename ?? "",
            }
          : undefined,
      })

      window.dispatchEvent(
        new CustomEvent("ttv-cart-updated", {
          detail: {
            delta: quantity,
          },
        })
      )
      router.refresh()
    } catch (error) {
      setAddToCartError(
        error instanceof Error ? error.message : "Could not add to cart"
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-y-5" ref={actionsRef}>
        <QuantityPriceList
          prices={selectedQuantityPrices}
          currencyCode={region.currency_code}
          quantity={quantity}
        />

        <div>
          {selectedExploreImage ? (
            <div className="mb-5 grid grid-cols-[72px_1fr] gap-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
              <img
                src={selectedExploreImage.url}
                alt={selectedExploreImage.alt || selectedExploreImage.title || selectedExploreImage.code}
                className="h-[72px] w-[72px] rounded-md object-cover"
              />
              <div className="grid content-center gap-1">
                <Text className="text-sm font-semibold text-ui-fg-base">
                  {selectedExploreImage.title || selectedExploreImage.code}
                </Text>
                {selectedExploreImage.explore_group_label ||
                selectedExploreImage.explore_item_name ? (
                  <Text className="text-xs text-ui-fg-subtle">
                    {[
                      selectedExploreImage.explore_group_label,
                      selectedExploreImage.explore_item_name,
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                  </Text>
                ) : null}
                <Text className="text-xs text-ui-fg-muted">
                  Code: {selectedExploreImage.code}
                </Text>
                {selectedExploreImage.original_filename ? (
                  <Text className="text-xs text-ui-fg-muted">
                    {selectedExploreImage.original_filename}
                  </Text>
                ) : null}
              </div>
            </div>
          ) : null}

          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <div className="flex items-end gap-3">
          <ProductPrice product={product} variant={selectedVariant} />
          <Text className="pb-1 text-sm text-ui-fg-muted">incl. VAT</Text>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={clx("h-2 w-2 rounded-full", {
              "bg-green-600": inStock,
              "bg-red-600": !inStock,
            })}
          />
          <Text className="text-sm text-ui-fg-base">
            {inStock ? "Made to order" : "Select a variant"}
          </Text>
        </div>

        <div className="grid grid-cols-[8.25rem_1fr] gap-3">
          <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center overflow-hidden rounded-lg border border-ui-border-base bg-[#f2f0f1]">
            <button
              type="button"
              className="h-12 text-xl text-ui-fg-base disabled:text-ui-fg-disabled"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={quantity <= 1 || isAdding}
            >
              -
            </button>
            <input
              className="h-12 w-full bg-white text-center font-semibold outline-none"
              min={1}
              max={99}
              inputMode="numeric"
              pattern="[0-9]*"
              type="text"
              value={quantity}
              onChange={(event) =>
                setQuantity(parseQuantity(event.target.value))
              }
              disabled={isAdding}
            />
            <button
              type="button"
              className="h-12 text-xl text-ui-fg-base disabled:text-ui-fg-disabled"
              onClick={() => setQuantity((current) => Math.min(99, current + 1))}
              disabled={isAdding}
            >
              +
            </button>
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={
              !inStock ||
              !selectedVariant ||
              !addToCartAction ||
              !!disabled ||
              isAdding ||
              !isValidVariant
            }
            variant="primary"
            className="h-12 w-full rounded-lg text-base font-bold"
            isLoading={isAdding}
            data-testid="add-product-button"
          >
            {addToCartLabel}
          </Button>
        </div>
        {addToCartError && (
          <Text className="text-sm font-medium text-red-600">
            {addToCartError}
          </Text>
        )}

        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}

function parseQuantity(value: string | null): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return Math.min(99, Math.floor(parsed))
}


