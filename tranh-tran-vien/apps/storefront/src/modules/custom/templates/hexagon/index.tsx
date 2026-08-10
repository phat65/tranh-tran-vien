"use client"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, clx } from "@modules/common/components/ui"
import ProductPrice from "@modules/products/components/product-price"
import {
  buildCropImageStyle,
  clampCrop,
  CustomCrop,
  CustomCropModal,
  CustomUploadDraft,
  getDefaultCrop,
} from "@modules/custom-wall/templates"
import { useRouter } from "next/navigation"
import { ChangeEvent, useMemo, useState, useTransition } from "react"

type ComboTier = {
  minimum_quantity: number
  discount_type: "percentage" | "fixed" | "fixed_total"
  discount_value: number
  label?: string | null
  is_featured?: boolean
  is_free_shipping?: boolean
}

type ComboRule = {
  id: string
  name: string
  tiers: ComboTier[]
  ends_at?: string | null
}

type UploadedCustomImage = {
  id: string
  imageUrl: string
  filename: string
  crop: CustomCrop
}

type HexagonCustomTemplateProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
  comboRules?: ComboRule[]
  displayDescription?: string
  displayTitle?: string
}

const HEX_CLIP_PATH =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
const PREVIEW_HEX_WIDTH = 510
const PREVIEW_HEX_HEIGHT = 594

const HexagonCustomTemplate = ({
  product,
  countryCode,
  comboRules = [],
  displayDescription,
  displayTitle,
}: HexagonCustomTemplateProps) => {
  const router = useRouter()
  const [images, setImages] = useState<UploadedCustomImage[]>([])
  const [activeImageId, setActiveImageId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CustomUploadDraft | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedVariant = useMemo(() => pickVariant(product), [product])
  const activeImage = useMemo(
    () => images.find((item) => item.id === activeImageId) ?? images[0] ?? null,
    [activeImageId, images]
  )
  const itemCount = images.length
  const inStock = useMemo(
    () =>
      selectedVariant
        ? isVariantInStock(selectedVariant, Math.max(1, itemCount))
        : false,
    [itemCount, selectedVariant]
  )
  const comboTiers = useMemo(() => {
    return comboRules
      .flatMap((rule) =>
        rule.tiers.map((tier) => ({
          rule,
          tier,
        }))
      )
      .filter(({ tier }) => tier.minimum_quantity > 1)
      .sort((a, b) => {
        if (a.tier.minimum_quantity !== b.tier.minimum_quantity) {
          return a.tier.minimum_quantity - b.tier.minimum_quantity
        }

        return Number(b.tier.is_featured) - Number(a.tier.is_featured)
      })
  }, [comboRules])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file")
      return
    }

    if (draft?.previewUrl) {
      URL.revokeObjectURL(draft.previewUrl)
    }

    setError(null)
    setSuccessMessage(null)
    setDraft({
      file,
      previewUrl: URL.createObjectURL(file),
      crop: getDefaultCrop(),
    })
  }

  const closeCrop = () => {
    if (draft?.previewUrl) {
      URL.revokeObjectURL(draft.previewUrl)
    }

    setDraft(null)
  }

  const updateCrop = (crop: Partial<CustomCrop>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            crop: clampCrop({
              ...current.crop,
              ...crop,
            }),
          }
        : current
    )
  }

  const confirmUpload = async () => {
    if (!draft) {
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", draft.file)

      const response = await fetch("/api/custom-wall/upload", {
        method: "POST",
        body: formData,
      })
      const payload = (await response.json().catch(() => null)) as
        | {
            url?: string
            filename?: string
            message?: string
          }
        | null

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.message ?? "Could not upload custom image")
      }

      const nextImage = {
        id: createImageId(),
        imageUrl: payload.url,
        filename: payload.filename ?? draft.file.name,
        crop: draft.crop,
      }

      setImages((current) => [...current, nextImage])
      setActiveImageId(nextImage.id)
      closeCrop()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload custom image")
    } finally {
      setIsUploading(false)
    }
  }

  const addToCart = () => {
    if (!selectedVariant?.id) {
      return
    }

    if (!images.length) {
      setError("Please upload and crop at least one image first")
      return
    }

    setError(null)
    setSuccessMessage(null)
    startTransition(async () => {
      try {
        const response = await fetch("/api/custom-wall/cart", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            countryCode,
            items: images.map((image, index) => ({
                variantId: selectedVariant.id,
                quantity: 1,
                metadata: {
                  ttv_source: "custom_hexagon_page",
                  ttv_custom_type: "hexagon_poster",
                  ttv_custom_display_title: displayTitle ?? product.title,
                  ttv_price_carrier_product_id: product.id,
                  ttv_price_carrier_product_title: product.title,
                  ttv_custom_item_index: index + 1,
                  ttv_custom_image_url: image.imageUrl,
                  ttv_custom_original_filename: image.filename,
                  ttv_crop: image.crop,
                },
              })),
          }),
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.message ?? "Could not add to cart")
        }

        window.dispatchEvent(
          new CustomEvent("ttv-cart-updated", {
            detail: {
              delta: images.length,
            },
          })
        )
        router.refresh()
        setSuccessMessage(
          `Added ${images.length} custom poster${
            images.length > 1 ? "s" : ""
          } to cart`
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add to cart")
      }
    })
  }

  const removeImage = (imageId: string) => {
    setImages((current) => current.filter((item) => item.id !== imageId))
    setActiveImageId((current) => {
      if (current !== imageId) {
        return current
      }

      return images.find((item) => item.id !== imageId)?.id ?? null
    })
    setSuccessMessage(null)
  }

  return (
    <main className="bg-white text-[#17181c]">
      <section
        className="content-container grid gap-10 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start"
        data-testid="custom-hexagon-container"
      >
        <div className="w-full">
          <div className="grid gap-6 medium:grid-cols-[72px_minmax(0,1fr)]">
            <div className="order-2 flex gap-3 overflow-x-auto medium:order-1 medium:grid medium:max-h-[520px] medium:content-start medium:gap-4 medium:overflow-y-auto medium:overflow-x-visible medium:pr-1">
              {images.map((image, index) => (
                <PreviewThumb
                  key={image.id}
                  image={image}
                  index={index + 1}
                  isActive={activeImage?.id === image.id}
                  onRemove={() => removeImage(image.id)}
                  onSelect={() => setActiveImageId(image.id)}
                />
              ))}
              <label className="grid h-[78px] w-[64px] shrink-0 cursor-pointer place-items-center rounded-sm border border-dashed border-[#cfd6ca] bg-[#f6f7f2] text-2xl text-[#7c8477] transition-colors hover:border-[#8edb24] hover:text-[#4f7c13]">
                +
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="order-1 grid place-items-center medium:order-2">
              <div
                className="relative grid w-full place-items-center overflow-hidden rounded-lg bg-[#f3f4ef]"
                style={{
                  minHeight: 520,
                }}
              >
                <div
                  className="relative grid place-items-center overflow-hidden bg-[#e4e7df]"
                  style={{
                    clipPath: HEX_CLIP_PATH,
                    height: "min(72vw, 594px)",
                    maxHeight: PREVIEW_HEX_HEIGHT,
                    maxWidth: PREVIEW_HEX_WIDTH,
                    width: "min(62vw, 510px)",
                  }}
                >
                  {activeImage ? (
                    <CroppedHexImage image={activeImage} />
                  ) : (
                    <div className="grid gap-3 px-10 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#c9d1c3] text-2xl text-[#7a8374]">
                        +
                      </div>
                      <p className="text-sm font-semibold uppercase tracking-normal text-[#6f786a]">
                        Upload custom image
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-y-8 lg:sticky lg:top-28">
          <div className="flex flex-col gap-y-5">
            <h1 className="max-w-full text-4xl font-black leading-tight text-ui-fg-base">
              {displayTitle ?? product.title}
            </h1>
            <p className="text-base leading-7 text-ui-fg-subtle whitespace-pre-line">
              {displayDescription ??
                product.description ??
                "Custom uploaded hexagon poster used by the wall builder."}
            </p>
          </div>

          {!!comboTiers.length && (
            <div className="grid gap-3 rounded-lg border border-[#d8ddd7] bg-[#f7f8f5] p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#343a33]">
                  Deal combo
                </p>
                <p className="text-sm text-[#687064]">
                  Tu dong tinh trong gio hang
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {comboTiers.map(({ rule, tier }) => (
                  <div
                    key={`${rule.id}-${tier.minimum_quantity}`}
                    className={clx(
                      "relative flex min-h-[4.25rem] flex-col justify-center rounded-lg border bg-white px-4 py-3 text-left shadow-sm",
                      {
                        "border-[#cfd7cf] text-[#20251f]": !tier.is_featured,
                        "border-[#9aa86f] bg-[#fbfcf2] text-[#20251f] ring-1 ring-[#bdc890]":
                          tier.is_featured,
                      }
                    )}
                  >
                    {tier.is_featured && (
                      <span className="absolute right-3 top-2 rounded-full bg-[#52613f] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                        Nen chon
                      </span>
                    )}
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#72806c]">
                      Tu {tier.minimum_quantity} tranh
                    </span>
                    <span className="mt-1 pr-12 text-sm font-bold leading-5">
                      {formatComboDealTitle(tier, product)}
                    </span>
                    {tier.is_free_shipping && (
                      <span className="mt-1 text-xs font-medium text-[#4d7b42]">
                        Freeship
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-[#d8ddd7] bg-[#f7f8f5] p-4">
            <p className="text-sm font-bold text-[#252a22]">
              {activeImage
                ? `${itemCount} anh custom da them`
                : "Upload anh custom"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#687064]">
              Moi anh se thanh mot tranh rieng trong cart, combo se tinh theo
              tong so tranh custom.
            </p>
            <label className="mt-4 grid h-11 cursor-pointer place-items-center rounded-md border border-[#d4dacd] bg-white px-5 text-sm font-bold uppercase text-[#252a22] transition-colors hover:border-[#8edb24] hover:text-[#4f7c13]">
              Them anh
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="flex items-end gap-3">
            <ProductPrice product={product} variant={selectedVariant} />
            <p className="pb-1 text-sm text-ui-fg-muted">incl. VAT</p>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span
              className={clx("h-2 w-2 rounded-full", {
                "bg-green-600": inStock,
                "bg-red-600": !inStock,
              })}
            />
            <p className="text-sm text-ui-fg-base">
              {inStock ? "In stock" : "Currently unavailable"}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="flex h-11 items-center justify-between rounded-lg border border-ui-border-base bg-[#f7f8f5] px-4 text-sm">
              <span className="font-medium text-ui-fg-subtle">So tranh custom</span>
              <span className="font-bold text-ui-fg-base">{itemCount}</span>
            </div>
            <Button
              onClick={addToCart}
              disabled={!inStock || !selectedVariant || isPending || !images.length}
              variant="primary"
              className="h-12 w-full rounded-lg text-base font-bold"
              isLoading={isPending}
            >
              Add {itemCount || ""} to cart
            </Button>
          </div>

          <LocalizedClientLink
            href="/custom-wall"
            className="text-sm font-medium text-ui-fg-muted underline underline-offset-4 hover:text-ui-fg-base"
          >
            Build wall preview
          </LocalizedClientLink>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              {successMessage}
            </p>
          )}
        </div>
      </section>

      <div className="content-container">
        <div className="border-t border-ui-border-base py-6">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ui-fg-base">
              Product Information
              <span className="text-xl leading-none">+</span>
            </summary>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-ui-fg-subtle">
              Upload anh rieng, crop trong khung luc giac, sau do them vao gio
              hang. Anh custom se duoc gui kem trong metadata cua san pham.
            </p>
          </details>
        </div>
      </div>

      {draft && (
        <CustomCropModal
          draft={draft}
          isUploading={isUploading}
          onCancel={closeCrop}
          onConfirm={confirmUpload}
          onCropChange={updateCrop}
        />
      )}
    </main>
  )
}

const PreviewThumb = ({
  image,
  index,
  isActive,
  onRemove,
  onSelect,
}: {
  image: UploadedCustomImage
  index: number
  isActive: boolean
  onRemove: () => void
  onSelect: () => void
}) => {
  return (
    <div
      className={clx(
        "group relative h-[78px] w-[64px] shrink-0 bg-[#eef1e9] transition-transform hover:scale-[1.02]",
        {
          "ring-2 ring-[#8edb24] ring-offset-2": isActive,
        }
      )}
    >
      <button
        type="button"
        className="absolute inset-0 overflow-hidden"
        onClick={onSelect}
        aria-label={`Preview custom image ${index}`}
        style={{ clipPath: HEX_CLIP_PATH }}
      >
        <CroppedHexImage image={image} frameWidth={64} frameHeight={78} />
      </button>
      <span className="pointer-events-none absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#17181c] text-[10px] font-bold text-white">
        {index}
      </span>
      <button
        type="button"
        className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-[#6f786a] opacity-0 shadow-sm ring-1 ring-[#d4dacd] transition-opacity hover:text-red-600 group-hover:opacity-100"
        onClick={(event) => {
          event.stopPropagation()
          onRemove()
        }}
        aria-label={`Remove custom image ${index}`}
      >
        x
      </button>
    </div>
  )
}

const CroppedHexImage = ({
  image,
  frameWidth = PREVIEW_HEX_WIDTH,
  frameHeight = PREVIEW_HEX_HEIGHT,
}: {
  image: UploadedCustomImage
  frameWidth?: number
  frameHeight?: number
}) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.imageUrl}
      alt=""
      className="absolute left-1/2 top-1/2 max-w-none select-none"
      draggable={false}
      style={buildCropImageStyle(image.crop, {
        height: frameHeight,
        width: frameWidth,
      })}
    />
  )
}

function pickVariant(product: HttpTypes.StoreProduct) {
  const variants = product.variants ?? []

  return (
    variants.find((variant) => isVariantInStock(variant, 1)) ??
    variants.find((variant) => Boolean(variant.id))
  )
}

function isVariantInStock(
  variant: HttpTypes.StoreProductVariant,
  quantity: number
) {
  if (!variant.manage_inventory || variant.allow_backorder) {
    return true
  }

  return Number(variant.inventory_quantity ?? 0) >= quantity
}

function formatComboDealTitle(tier: ComboTier, product: HttpTypes.StoreProduct) {
  if (tier.label?.trim()) {
    return tier.label.trim()
  }

  if (tier.discount_type === "percentage") {
    return `giam ${tier.discount_value}%`
  }

  if (tier.discount_type === "fixed_total") {
    return `${tier.discount_value.toLocaleString("vi-VN")}d`
  }

  const variant = pickVariant(product)
  const price = variant
    ? getProductPrice({ product, variantId: variant.id }).variantPrice
    : getProductPrice({ product }).cheapestPrice
  const currencyCode = price?.currency_code ?? "vnd"

  return `${tier.discount_value.toLocaleString("vi-VN")} ${currencyCode}`
}

function createImageId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default HexagonCustomTemplate
