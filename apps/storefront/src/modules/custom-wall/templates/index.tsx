"use client"

// Template ghép dữ liệu và component để dựng khu vực custom wall.

import { uploadCustomWallImage } from "@lib/client/custom-wall"
import type { CustomWallCartItemInput } from "@lib/data/custom-wall"
import { getProductPrice } from "@lib/util/get-product-price"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button, clx } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRouter } from "next/navigation"
import {
  ChangeEvent,
  DragEvent,
  PointerEvent,
  useMemo,
  useState,
  useTransition,
} from "react"

const DRAG_MIME = "application/x-ttv-wall-item"
const WALL_ROWS = [11, 10, 11, 10, 11]
const WALL_SLOT_WIDTH = 86
const WALL_SLOT_HEIGHT = 100
const WALL_GAP = 2
const WALL_X_STEP = WALL_SLOT_WIDTH + WALL_GAP
const WALL_Y_STEP = WALL_SLOT_HEIGHT * 0.75 + WALL_GAP / 2
const WALL_WIDTH = 1030
const WALL_HEIGHT = 420
const CROP_HEX_WIDTH = 340
const CROP_FRAME_HEIGHT = 390
const CROP_HORIZONTAL_BLEED = 0
const CROP_FRAME_WIDTH = CROP_HEX_WIDTH + CROP_HORIZONTAL_BLEED
const CROP_HEX_TOP = 0
const CROP_HEX_BOTTOM = 100
const CROP_HEX_SIDE_X =
  ((CROP_FRAME_WIDTH - CROP_HEX_WIDTH) / 2 / CROP_FRAME_WIDTH) * 100
const CROP_MIN_ZOOM = 1
const CROP_MAX_ZOOM = 4
const WALL_CENTER = {
  x: WALL_WIDTH / 2,
  y: WALL_HEIGHT / 2,
}
const WALL_SLOTS = buildWallSlots()
const SLOT_COUNT = WALL_SLOTS.length
const PLACEMENT_ORDER = [...WALL_SLOTS]
  .sort((first, second) => {
    const firstDistance = getSlotDistanceFromCenter(first)
    const secondDistance = getSlotDistanceFromCenter(second)

    if (firstDistance !== secondDistance) {
      return firstDistance - secondDistance
    }

    return first.slot - second.slot
  })
  .map((slot) => slot.slot)

type WallItem = {
  slot: number
  productId: string
  variantId: string
  title: string
  source: "product" | "custom"
  imageUrl?: string | null
  originalFilename?: string | null
  price?: number | null
  crop?: CustomCrop
  imageProduct?: ImageProductSnapshot
}

type ProductOption = {
  id: string
  title: string
  handle?: string | null
  thumbnail?: string | null
  imageUrl?: string | null
  variantId?: string
  price?: number | null
  priceLabel?: string | null
  inStock: boolean
  imageProduct?: ImageProductSnapshot
}

type ImageProductSnapshot = {
  virtualProductId: string
  imageId: string
  imageCode: string
  imageName: string
  imageHandle: string
  imageAlt: string
  parentProductId: string
  parentProductHandle: string
  originalFilename: string
}

type WallSlotDefinition = {
  slot: number
  row: number
  col: number
  x: number
  y: number
  centerX: number
  centerY: number
}

type DragPayload =
  | {
      source: "product"
      productId: string
    }
  | {
      source: "wall"
      slot: number
    }

type PointerDragState = {
  slot: number
  x: number
  y: number
}

export type CustomCrop = {
  offsetX: number
  offsetY: number
  zoom: number
  imageRatio?: number | null
}

export type CustomUploadDraft = {
  file: File
  previewUrl: string
  crop: CustomCrop
}

type CustomWallTemplateProps = {
  products: HttpTypes.StoreProduct[]
  collections: HttpTypes.StoreCollection[]
  countryCode: string
  currencyCode: string
  addItemsToCartAction: AddItemsToCartAction
}

type AddItemsToCartAction = (input: {
  items: CustomWallCartItemInput[]
  countryCode: string
}) => Promise<void>

const CustomWallTemplate = ({
  products,
  collections,
  countryCode,
  currencyCode,
  addItemsToCartAction,
}: CustomWallTemplateProps) => {
  const router = useRouter()
  const [selectedCollectionId, setSelectedCollectionId] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [wallItems, setWallItems] = useState<WallItem[]>([])
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const [pointerDrag, setPointerDrag] = useState<PointerDragState | null>(null)
  const [lastAnimatedSlot, setLastAnimatedSlot] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [customDraft, setCustomDraft] = useState<CustomUploadDraft | null>(null)
  const [isUploadingCustom, setIsUploadingCustom] = useState(false)
  const [isPending, startTransition] = useTransition()

  const productOptions = useMemo(
    () => products.map(toProductOption).filter((product) => product.variantId),
    [products]
  )

  const customProduct = useMemo(
    () => productOptions.find(isCustomWallProduct) ?? null,
    [productOptions]
  )
  const shopProductOptions = useMemo(
    () => productOptions.filter((product) => !isCustomWallProduct(product)),
    [productOptions]
  )

  const visibleProducts = useMemo(() => {
    const query = normalizeSearch(searchQuery)
    const collectionProducts =
      selectedCollectionId === "all"
        ? shopProductOptions
        : shopProductOptions.filter((product) => {
            const source = products.find((item) => item.id === product.id)

            return source?.collection_id === selectedCollectionId
          })

    if (!query) {
      return collectionProducts
    }

    return collectionProducts.filter((product) => {
      return normalizeSearch(`${product.title} ${product.handle ?? ""}`).includes(
        query
      )
    })
  }, [shopProductOptions, products, selectedCollectionId, searchQuery])

  const productById = useMemo(() => {
    return new Map(productOptions.map((product) => [product.id, product]))
  }, [productOptions])

  const placedCount = wallItems.length
  const emptyCount = SLOT_COUNT - placedCount
  const subtotal = wallItems.reduce((sum, item) => sum + (item.price ?? 0), 0)
  const canAddMore = wallItems.length < SLOT_COUNT
  const pointerDragItem = pointerDrag
    ? wallItems.find((item) => item.slot === pointerDrag.slot)
    : undefined

  const addProductToWall = (product: ProductOption) => {
    if (!product.variantId || !canAddMore) {
      return
    }

    setSuccessMessage(null)
    const slot = getNextSlot(wallItems.map((item) => item.slot))
    setLastAnimatedSlot(slot)

    setWallItems((current) => [
      ...current,
      {
        slot,
        productId: product.id,
        variantId: product.variantId!,
        title: product.title,
        source: "product",
        imageUrl: product.imageUrl ?? product.thumbnail,
        price: product.price,
        imageProduct: product.imageProduct,
      },
    ])
  }

  const placeProductAtSlot = (product: ProductOption, slot: number) => {
    if (!product.variantId) {
      return
    }

    setSuccessMessage(null)
    setLastAnimatedSlot(slot)
    setWallItems((current) => {
      const withoutTarget = current.filter((item) => item.slot !== slot)

      return [
        ...withoutTarget,
        {
          slot,
          productId: product.id,
          variantId: product.variantId!,
          title: product.title,
          source: "product",
          imageUrl: product.imageUrl ?? product.thumbnail,
          price: product.price,
          imageProduct: product.imageProduct,
        },
      ]
    })
  }

  const moveWallItem = (sourceSlot: number, targetSlot: number) => {
    if (sourceSlot === targetSlot) {
      return
    }

    setSuccessMessage(null)
    setLastAnimatedSlot(targetSlot)
    setWallItems((current) => {
      const source = current.find((item) => item.slot === sourceSlot)

      if (!source) {
        return current
      }

      const target = current.find((item) => item.slot === targetSlot)

      return current.map((item) => {
        if (item.slot === sourceSlot) {
          return { ...item, slot: targetSlot }
        }

        if (target && item.slot === targetSlot) {
          return { ...item, slot: sourceSlot }
        }

        return item
      })
    })
  }

  const removeWallItem = (slot: number) => {
    setSuccessMessage(null)
    setWallItems((current) => current.filter((item) => item.slot !== slot))
  }

  const handleProductDragStart = (
    event: DragEvent,
    product: ProductOption
  ) => {
    if (!product.variantId) {
      event.preventDefault()
      return
    }

    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData(
      DRAG_MIME,
      JSON.stringify({
        source: "product",
        productId: product.id,
      })
    )
  }

  const handleWallItemDragStart = (event: DragEvent, slot: number) => {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData(
      DRAG_MIME,
      JSON.stringify({
        source: "wall",
        slot,
      })
    )
  }

  const handleWallItemPointerStart = (
    event: PointerEvent<HTMLDivElement>,
    slot: number
  ) => {
    if (event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement

    if (target.closest("button")) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
    setPointerDrag({
      slot,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleWallItemPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerDrag) {
      return
    }

    event.preventDefault()
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-wall-slot]")
    const targetSlot = target?.getAttribute("data-wall-slot")
    const parsedSlot = Number(targetSlot)

    setDragOverSlot(Number.isInteger(parsedSlot) ? parsedSlot : null)
    setPointerDrag((current) =>
      current
        ? {
            ...current,
            x: event.clientX,
            y: event.clientY,
          }
        : current
    )
  }

  const handleWallItemPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerDrag) {
      return
    }

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-wall-slot]")
    const targetSlot = target?.getAttribute("data-wall-slot")
    const parsedSlot = Number(targetSlot)

    if (Number.isInteger(parsedSlot)) {
      moveWallItem(pointerDrag.slot, parsedSlot)
    }

    setPointerDrag(null)
    setDragOverSlot(null)
  }

  const handleSlotDrop = (event: DragEvent, slot: number) => {
    event.preventDefault()
    setDragOverSlot(null)

    const payload = readDragPayload(event)

    if (!payload) {
      return
    }

    if (payload.source === "product") {
      const product = productById.get(payload.productId)

      if (product) {
        placeProductAtSlot(product, slot)
      }

      return
    }

    moveWallItem(payload.slot, slot)
  }

  const handleCustomFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file")
      return
    }

    setError(null)
    setSuccessMessage(null)
    setCustomDraft({
      file,
      previewUrl: URL.createObjectURL(file),
      crop: getDefaultCrop(),
    })
  }

  const closeCustomCrop = () => {
    if (customDraft?.previewUrl) {
      URL.revokeObjectURL(customDraft.previewUrl)
    }

    setCustomDraft(null)
  }

  const updateCustomCrop = (crop: Partial<CustomCrop>) => {
    setCustomDraft((current) =>
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

  const confirmCustomUpload = async () => {
    if (
      !customDraft ||
      !customProduct?.variantId ||
      !canAddMore
    ) {
      return
    }

    setError(null)
    setSuccessMessage(null)
    setIsUploadingCustom(true)

    try {
      const payload = await uploadCustomWallImage(customDraft.file)

      const slot = getNextSlot(wallItems.map((item) => item.slot))
      setLastAnimatedSlot(slot)
      setWallItems((current) => [
        ...current,
        {
          slot,
          productId: customProduct.id,
          variantId: customProduct.variantId!,
          title: customProduct.title,
          source: "custom",
          imageUrl: payload.url,
          originalFilename: payload.filename ?? customDraft.file.name,
          price: customProduct.price,
          crop: customDraft.crop,
        },
      ])
      closeCustomCrop()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload custom image")
    } finally {
      setIsUploadingCustom(false)
    }
  }

  const addWallToCart = () => {
    if (!wallItems.length) {
      return
    }

    setError(null)
    setSuccessMessage(null)
    startTransition(async () => {
      try {
        await addItemsToCartAction({
          countryCode,
          items: wallItems.map((item) => {
            if (item.source === "product") {
              return {
                source: "product",
                variantId: item.variantId,
                quantity: 1,
                imageUrl: item.imageUrl,
                originalFilename: item.imageProduct?.originalFilename,
                wallSlot: item.slot,
                virtualProductId: item.imageProduct?.virtualProductId,
                imageId: item.imageProduct?.imageId,
                imageCode: item.imageProduct?.imageCode,
                imageName: item.imageProduct?.imageName,
                imageHandle: item.imageProduct?.imageHandle,
                imageAlt: item.imageProduct?.imageAlt,
                parentProductId: item.imageProduct?.parentProductId,
                parentProductHandle: item.imageProduct?.parentProductHandle,
              }
            }

            return {
              source: "custom_wall",
              variantId: item.variantId,
              quantity: 1,
              imageUrl: item.imageUrl,
              originalFilename: item.originalFilename,
              wallSlot: item.slot,
              crop: item.crop,
            }
          }),
        })

        window.dispatchEvent(
          new CustomEvent("ttv-cart-updated", {
            detail: {
              delta: placedCount,
            },
          })
        )
        router.refresh()
        setSuccessMessage(
          `Added ${placedCount} item${placedCount > 1 ? "s" : ""} to cart`
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add wall to cart")
      }
    })
  }

  return (
    <main className="min-h-screen bg-[#f5f6f1] text-[#151515]">
      <section className="content-container py-8 small:py-12">
        <div className="mb-8 grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f8f16]">
            Hexagon wall builder
          </p>
          <div className="grid gap-4 large:grid-cols-[1fr_auto] large:items-end">
            <div>
              <h1 className="max-w-[48rem] text-[2.6rem] font-semibold leading-none tracking-normal small:text-[4.5rem]">
                Build your wall preview
              </h1>
              <p className="mt-4 max-w-[42rem] text-base leading-7 text-[#62695d]">
                Chọn tranh có sẵn để xem bố cục lục giác trước khi thêm vào giỏ
                hàng. Giá combo sẽ được tính tự động trong cart.
              </p>
            </div>
            <LocalizedClientLink
              href="/store"
              className="justify-self-start rounded-md border border-[#d9ded1] bg-white px-4 py-3 text-sm font-semibold text-[#42483e] transition-colors hover:border-[#7fb51d] hover:text-[#4f7c13] large:justify-self-end"
            >
              Back to store
            </LocalizedClientLink>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <aside className="rounded-lg border border-[#dfe4d8] bg-white p-4 shadow-[0_18px_60px_rgba(40,50,30,0.1)]">
            <div className="rounded-lg border border-dashed border-[#7fb51d] bg-[#f7faef] p-5 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#dff7a6] text-2xl font-semibold text-[#5f8f16]">
                +
              </div>
              <p className="mt-3 text-sm font-bold uppercase text-[#4f7c13]">
                Upload custom image
              </p>
              <label
                className={clx(
                  "mx-auto mt-4 flex h-10 max-w-[220px] items-center justify-center rounded-full px-4 text-xs font-bold uppercase transition-colors",
                  {
                    "cursor-pointer bg-[#8edb24] text-[#172006] hover:bg-[#9bea31]":
                      Boolean(customProduct) && canAddMore,
                    "cursor-not-allowed bg-[#dfe4d8] text-[#8a9283]":
                      !customProduct || !canAddMore,
                  }
                )}
              >
                Choose image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={!customProduct || !canAddMore}
                  onChange={handleCustomFileChange}
                />
              </label>
              {!customProduct && (
                <p className="mt-3 text-xs font-semibold text-red-600">
                  Missing product handle custom-hexagon-poster
                </p>
              )}
              {customProduct?.priceLabel && (
                <p className="mt-3 text-xs font-semibold text-[#727a6c]">
                  {customProduct.priceLabel} per custom image
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#767d70]">
                Filter
              </span>
              <select
                value={selectedCollectionId}
                onChange={(event) => setSelectedCollectionId(event.target.value)}
                className="h-10 min-w-[12rem] rounded-md border border-[#9ec94d] bg-white px-3 text-sm font-semibold text-[#252a22] outline-none"
              >
                <option value="all">All collections</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </select>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products"
                className="h-10 min-w-[12rem] flex-1 rounded-md border border-[#d9ded1] bg-white px-3 text-sm font-semibold text-[#252a22] outline-none transition-colors placeholder:text-[#9aa193] focus:border-[#9ec94d]"
              />
              <span className="rounded-full bg-[#8edb24] px-3 py-1 text-xs font-bold text-[#172006]">
                {visibleProducts.length}
              </span>
            </div>

            <div className="mt-5 grid max-h-[610px] grid-cols-2 gap-3 overflow-y-auto pr-1 small:grid-cols-3 xl:grid-cols-2 min-[1440px]:grid-cols-3">
              {visibleProducts.length ? (
                visibleProducts.map((product) => (
                  <ProductPickerCard
                    key={product.id}
                    product={product}
                    onAdd={() => addProductToWall(product)}
                    onDragStart={(event) =>
                      handleProductDragStart(event, product)
                    }
                    disabled={!canAddMore}
                  />
                ))
              ) : (
                <div className="col-span-full rounded-md border border-dashed border-[#d9ded1] bg-[#fbfcf7] p-5 text-center text-sm font-semibold text-[#727a6c]">
                  No products found
                </div>
              )}
            </div>
          </aside>

          <section className="rounded-lg border border-[#dfe4d8] bg-white p-4 shadow-[0_18px_60px_rgba(40,50,30,0.1)] small:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#767d70]">
                Honeycomb canvas
              </p>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-[#4f7c13]">{placedCount}</span>
                <span className="text-[#767d70]">placed</span>
                <span className="font-bold text-[#4f7c13]">{emptyCount}</span>
                <span className="text-[#767d70]">empty</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-4 pt-2">
              <div
                className="relative mx-auto min-w-[1030px]"
                style={{
                  width: WALL_WIDTH,
                  height: WALL_HEIGHT,
                }}
              >
                {WALL_SLOTS.map((definition) => {
                  const item = wallItems.find(
                    (entry) => entry.slot === definition.slot
                  )

                  return (
                    <WallSlot
                      key={definition.slot}
                      item={item}
                      slot={definition.slot}
                      x={definition.x}
                      y={definition.y}
                      isDragOver={dragOverSlot === definition.slot}
                      isNew={lastAnimatedSlot === definition.slot}
                      onRemove={removeWallItem}
                      onDrop={handleSlotDrop}
                      onDragEnter={setDragOverSlot}
                      onDragLeave={() => setDragOverSlot(null)}
                      onWallItemDragStart={handleWallItemDragStart}
                      onWallItemPointerStart={handleWallItemPointerStart}
                      onWallItemPointerMove={handleWallItemPointerMove}
                      onWallItemPointerEnd={handleWallItemPointerEnd}
                    />
                  )
                })}
                {pointerDrag && pointerDragItem?.imageUrl && (
                  <div
                    className="pointer-events-none fixed z-[80] opacity-90 drop-shadow-[0_18px_30px_rgba(15,23,42,0.24)]"
                    style={{
                      clipPath: hexClipPath,
                      height: WALL_SLOT_HEIGHT,
                      left: pointerDrag.x - WALL_SLOT_WIDTH / 2,
                      top: pointerDrag.y - WALL_SLOT_HEIGHT / 2,
                      width: WALL_SLOT_WIDTH,
                    }}
                  >
                    {pointerDragItem.source === "custom" ? (
                      <CustomCropSquareImage
                        imageUrl={pointerDragItem.imageUrl}
                        crop={pointerDragItem.crop}
                        size={WALL_SLOT_HEIGHT}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pointerDragItem.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 small:flex-row">
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage(null)
                  setWallItems([])
                }}
                disabled={!wallItems.length || isPending}
                className="h-12 rounded-full border border-[#d4dacd] bg-white px-8 text-sm font-semibold text-[#6d7567] transition-colors hover:border-[#aeb8a5] hover:text-[#252a22] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Clear all
              </button>
              <Button
                type="button"
                onClick={addWallToCart}
                disabled={!wallItems.length || isPending}
                isLoading={isPending}
                className="h-12 min-w-[320px] rounded-full bg-[#8edb24] px-8 text-sm font-bold uppercase text-[#172006] shadow-[0_14px_30px_rgba(113,170,29,0.25)] hover:bg-[#9bea31] disabled:opacity-45"
              >
                {successMessage ? "Added to cart" : "Add to cart"}
                <span className="ml-4">
                  {convertToLocale({
                    amount: subtotal,
                    currency_code: currencyCode,
                  })}
                </span>
              </Button>
            </div>
            {error && (
              <p className="mt-4 text-center text-sm font-medium text-red-600">
                {error}
              </p>
            )}
            {successMessage && (
              <p className="mt-4 text-center text-sm font-semibold text-[#4f7c13]">
                {successMessage}
              </p>
            )}
            {!wallItems.length && (
              <p className="mt-5 text-center text-sm text-[#767d70]">
                Bấm + Add trên sản phẩm để đặt tranh vào giữa canvas.
              </p>
            )}
          </section>
        </div>
      </section>
      {customDraft && (
        <CustomCropModal
          draft={customDraft}
          isUploading={isUploadingCustom}
          onCancel={closeCustomCrop}
          onConfirm={confirmCustomUpload}
          onCropChange={updateCustomCrop}
        />
      )}
      <style jsx global>{`
        @keyframes ttv-wall-tile-enter {
          0% {
            opacity: 0;
            transform: translate3d(0, 14px, 0) scale(0.58);
            filter: blur(2px);
          }
          62% {
            opacity: 1;
            transform: translate3d(0, -3px, 0) scale(1.08);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0);
          }
        }

        .ttv-wall-tile-enter {
          animation: ttv-wall-tile-enter 360ms cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </main>
  )
}

export const CustomCropModal = ({
  draft,
  isUploading,
  onCancel,
  onConfirm,
  onCropChange,
}: {
  draft: CustomUploadDraft
  isUploading: boolean
  onCancel: () => void
  onConfirm: () => void
  onCropChange: (crop: Partial<CustomCrop>) => void
}) => {
  const [dragStart, setDragStart] = useState<{
    x: number
    y: number
    offsetX: number
    offsetY: number
  } | null>(null)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragStart({
      x: event.clientX,
      y: event.clientY,
      offsetX: draft.crop.offsetX,
      offsetY: draft.crop.offsetY,
    })
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart) {
      return
    }

    onCropChange({
      offsetX: dragStart.offsetX + event.clientX - dragStart.x,
      offsetY: dragStart.offsetY + event.clientY - dragStart.y,
    })
  }

  const handlePointerEnd = () => {
    setDragStart(null)
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-[460px] rounded-[18px] border border-[#dfe4d8] bg-white px-6 pb-6 pt-6 text-[#151515] shadow-[0_24px_90px_rgba(40,50,30,0.18)]">
        <div className="relative mb-2 text-center">
          <h2 className="text-[22px] font-bold leading-7 text-[#4f7c13]">
            Crop Your Image
          </h2>
          <div className="mt-2 h-px w-full bg-[#e5e9df]" />
          <p className="mt-2 text-sm font-medium text-[#767d70]">
            Drag to position, zoom to fit the hexagon
          </p>
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="absolute right-0 top-0 grid h-8 w-8 place-items-center rounded-full border border-[#d9ded1] text-sm font-bold text-[#767d70] transition-colors hover:border-[#7fb51d] hover:text-[#4f7c13]"
            aria-label="Close crop"
          >
            x
          </button>
        </div>

        <p className="mb-3 text-center text-xs font-bold text-[#5f8f16]">
          Image 1 of 1
        </p>

        <div className="grid justify-center">
          <div
            className="relative cursor-grab overflow-hidden rounded-[10px] bg-[#eef1e9] active:cursor-grabbing"
            style={{
              height: CROP_FRAME_HEIGHT,
              width: CROP_FRAME_WIDTH,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.previewUrl}
              alt=""
              className="absolute left-1/2 top-1/2 max-w-none select-none"
              draggable={false}
              onLoad={(event) => {
                const image = event.currentTarget
                const imageRatio = image.naturalWidth / image.naturalHeight

                if (Number.isFinite(imageRatio) && imageRatio > 0) {
                  onCropChange({ imageRatio })
                }
              }}
              style={buildCropImageStyle(draft.crop, {
                height: CROP_FRAME_HEIGHT,
                width: CROP_FRAME_WIDTH,
              })}
            />
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <mask id="ttv-crop-hex-mask">
                  <rect width="100" height="100" fill="white" />
                  <polygon
                    points={cropHexPoints}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100"
                height="100"
                fill="rgba(21, 21, 21, 0.42)"
                mask="url(#ttv-crop-hex-mask)"
              />
              <polygon
                points={cropHexPoints}
                fill="none"
                stroke="rgba(126, 181, 29, 0.68)"
                strokeWidth="0.35"
              />
            </svg>
          </div>
        </div>

        <label className="mt-5 grid gap-2 text-sm font-semibold text-[#767d70]">
          <span className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="grid h-4 w-4 place-items-center rounded-full border border-[#7fb51d]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7fb51d]" />
              </span>
              <span className="sr-only">Zoom</span>
            </span>
            <span className="text-xs font-medium text-[#767d70]">
              {Math.round(draft.crop.zoom * 100)}%
            </span>
          </span>
          <input
            type="range"
            min={CROP_MIN_ZOOM}
            max={CROP_MAX_ZOOM}
            step="0.05"
            value={draft.crop.zoom}
            onChange={(event) =>
              onCropChange({ zoom: Number(event.target.value) })
            }
            className="w-full accent-[#8edb24]"
          />
        </label>

        <div className="mt-6 flex flex-col-reverse gap-3 small:flex-row small:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="h-11 flex-1 rounded-xl border border-[#d4dacd] bg-white px-6 text-sm font-bold uppercase text-[#6d7567] transition-colors hover:border-[#7fb51d] hover:text-[#4f7c13] disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            type="button"
            onClick={onConfirm}
            isLoading={isUploading}
            disabled={isUploading}
            className="h-11 flex-1 rounded-xl bg-[#8edb24] px-7 text-sm font-bold uppercase text-[#172006] hover:bg-[#9bea31]"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}

const CustomCropSquareImage = ({
  imageUrl,
  crop,
  size,
}: {
  imageUrl: string
  crop?: CustomCrop
  size: number
}) => {
  return (
    <div
      className="absolute left-1/2 top-1/2 overflow-hidden"
      style={{
        height: size,
        transform: "translate(-50%, -50%)",
        width: size,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="absolute left-1/2 top-1/2 max-w-none select-none"
        draggable={false}
        style={buildCropImageStyle(crop, {
          height: size,
          width: (size * CROP_FRAME_WIDTH) / CROP_FRAME_HEIGHT,
        })}
      />
    </div>
  )
}

const ProductPickerCard = ({
  product,
  onAdd,
  onDragStart,
  disabled,
}: {
  product: ProductOption
  onAdd: () => void
  onDragStart: (event: DragEvent) => void
  disabled: boolean
}) => {
  return (
    <article
      className={clx(
        "rounded-lg border border-[#e0e4d9] bg-[#fbfcf8] p-3 transition-colors",
        {
          "cursor-grab hover:border-[#7fb51d]/70 active:cursor-grabbing":
            !disabled,
          "opacity-55": disabled,
        }
      )}
      draggable={!disabled}
      onDragStart={onDragStart}
    >
      <div
        className="mx-auto h-[100px] w-[86px] overflow-hidden bg-[#e8ecdf]"
        style={{ clipPath: hexClipPath }}
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-[#e2e7d8]" />
        )}
      </div>
      <h2 className="mt-3 line-clamp-2 min-h-10 text-xs font-medium leading-5 text-[#62695d]">
        {product.title}
      </h2>
      <p className="mt-1 text-sm font-bold text-[#252a22]">
        {product.priceLabel ?? "No price"}
      </p>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="mt-3 h-9 w-full rounded-md border border-[#d5dbc9] text-xs font-bold uppercase text-[#3c4436] transition-colors hover:border-[#7fb51d] hover:bg-[#8edb24] hover:text-[#172006] disabled:cursor-not-allowed disabled:border-[#e4e8dd] disabled:text-[#a4ab9d]"
      >
        + Add
      </button>
      {product.handle && (
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          className="mt-2 block text-center text-xs text-[#767d70] underline transition-colors hover:text-[#252a22]"
        >
          View details
        </LocalizedClientLink>
      )}
    </article>
  )
}

const WallSlot = ({
  item,
  slot,
  x,
  y,
  isDragOver,
  isNew,
  onRemove,
  onDrop,
  onDragEnter,
  onDragLeave,
  onWallItemDragStart,
  onWallItemPointerStart,
  onWallItemPointerMove,
  onWallItemPointerEnd,
}: {
  item?: WallItem
  slot: number
  x: number
  y: number
  isDragOver: boolean
  isNew: boolean
  onRemove: (slot: number) => void
  onDrop: (event: DragEvent, slot: number) => void
  onDragEnter: (slot: number) => void
  onDragLeave: () => void
  onWallItemDragStart: (event: DragEvent, slot: number) => void
  onWallItemPointerStart: (
    event: PointerEvent<HTMLDivElement>,
    slot: number
  ) => void
  onWallItemPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onWallItemPointerEnd: (event: PointerEvent<HTMLDivElement>) => void
}) => {
  return (
    <div
      data-wall-slot={slot}
      className={clx(
        "group absolute bg-transparent p-0 transition-[filter,transform,opacity] duration-200 ease-out",
        {
          "z-20 scale-[1.04] opacity-100 drop-shadow-[0_0_18px_rgba(126,181,29,0.35)]":
            isDragOver,
          "cursor-grab hover:z-10 hover:scale-[1.035] active:cursor-grabbing":
            item,
        }
      )}
      style={{
        clipPath: hexClipPath,
        height: WALL_SLOT_HEIGHT,
        left: x,
        top: y,
        width: WALL_SLOT_WIDTH,
      }}
      draggable={Boolean(item)}
      onDragStart={(event) => item && onWallItemDragStart(event, item.slot)}
      onDragEnd={() => onDragLeave()}
      onPointerDown={(event) =>
        item && onWallItemPointerStart(event, item.slot)
      }
      onPointerMove={onWallItemPointerMove}
      onPointerUp={onWallItemPointerEnd}
      onPointerCancel={onWallItemPointerEnd}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = item ? "move" : "copy"
      }}
      onDragEnter={(event) => {
        event.preventDefault()
        onDragEnter(slot)
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop(event, slot)}
    >
      <div
        className={clx(
          "relative h-full w-full overflow-hidden transition-colors duration-200",
          {
            "ttv-wall-tile-enter shadow-[0_12px_30px_rgba(113,170,29,0.18)]":
              item && isNew,
          }
        )}
        style={{ clipPath: hexClipPath }}
      >
        {item?.imageUrl && item.source === "custom" ? (
          <CustomCropSquareImage
            imageUrl={item.imageUrl}
            crop={item.crop}
            size={WALL_SLOT_HEIGHT}
          />
        ) : item?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className={clx(
              "absolute inset-0 bg-[#d9ded1] opacity-55 transition-opacity duration-200",
              {
                "opacity-70": isDragOver,
                "group-hover:opacity-55": !isDragOver,
              }
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/45 via-transparent to-[#bfc7b6]/35" />
          </div>
        )}

        {!item && (
          <span className="absolute inset-0 grid place-items-center text-lg font-semibold text-[#4f7c13]/0 transition-colors group-hover:text-[#4f7c13]">
            +
          </span>
        )}

        {item && (
          <>
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/35" />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onRemove(item.slot)
              }}
              onDragStart={(event) => event.preventDefault()}
              draggable={false}
              className="absolute right-3 top-4 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs font-bold text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
              aria-label={`Remove ${item.title}`}
            >
              x
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function toProductOption(product: HttpTypes.StoreProduct): ProductOption {
  const variant = pickVariant(product)
  const price = variant
    ? getProductPrice({ product, variantId: variant.id }).variantPrice ??
      getProductPrice({ product }).cheapestPrice
    : null

  const metadata = product.metadata as Record<string, unknown> | null | undefined
  const imageId = getMetadataString(metadata, "ttv_image_id")

  return {
    id: product.id!,
    title: product.title ?? "Untitled product",
    handle: product.handle,
    thumbnail: product.thumbnail,
    imageUrl: product.thumbnail ?? product.images?.[0]?.url,
    variantId: variant?.id,
    price: price?.calculated_price_number ?? null,
    priceLabel: price?.calculated_price ?? null,
    inStock: variant ? isVariantInStock(variant) : false,
    imageProduct: imageId
      ? {
          virtualProductId:
            getMetadataString(metadata, "ttv_virtual_product_id") || product.id!,
          imageId,
          imageCode: getMetadataString(metadata, "ttv_image_code"),
          imageName:
            getMetadataString(metadata, "ttv_image_title") ||
            product.title ||
            "Image product",
          imageHandle:
            getMetadataString(metadata, "ttv_image_handle") ||
            product.handle ||
            "",
          imageAlt: getMetadataString(metadata, "ttv_image_alt"),
          parentProductId: getMetadataString(metadata, "ttv_parent_product_id"),
          parentProductHandle: getMetadataString(
            metadata,
            "ttv_parent_product_handle"
          ),
          originalFilename: getMetadataString(
            metadata,
            "ttv_image_original_filename"
          ),
        }
      : undefined,
  }
}

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key]

  return typeof value === "string" ? value : ""
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase()
}

function isCustomWallProduct(product: ProductOption) {
  const handle = product.handle?.toLowerCase()
  const title = product.title.toLowerCase()

  return (
    handle === "custom-hexagon-poster" ||
    handle === "custom-wall-poster" ||
    title.includes("custom hexagon poster")
  )
}

export function buildCropImageStyle(
  crop?: CustomCrop,
  frame = {
    height: CROP_FRAME_HEIGHT,
    width: CROP_FRAME_WIDTH,
  }
) {
  const normalized = clampCrop(crop ?? getDefaultCrop())
  const baseSize = getFrameCoverSize(normalized.imageRatio, frame)
  const scaleX = frame.width / CROP_FRAME_WIDTH
  const scaleY = frame.height / CROP_FRAME_HEIGHT

  return {
    height: `${baseSize.height}px`,
    transform: `translate(calc(-50% + ${
      normalized.offsetX * scaleX
    }px), calc(-50% + ${normalized.offsetY * scaleY}px)) scale(${
      normalized.zoom
    })`,
    width: `${baseSize.width}px`,
  }
}

export function clampCrop(crop: CustomCrop): CustomCrop {
  const zoom = clamp(crop.zoom, CROP_MIN_ZOOM, CROP_MAX_ZOOM)
  const baseSize = getFrameCoverSize(crop.imageRatio, {
    height: CROP_FRAME_HEIGHT,
    width: CROP_FRAME_WIDTH,
  })
  const maxOffsetX = Math.max(0, (baseSize.width * zoom - CROP_FRAME_WIDTH) / 2)
  const maxOffsetY = Math.max(
    0,
    (baseSize.height * zoom - CROP_FRAME_HEIGHT) / 2
  )

  return {
    ...crop,
    offsetX: clamp(crop.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(crop.offsetY, -maxOffsetY, maxOffsetY),
    zoom,
  }
}

export function getDefaultCrop(): CustomCrop {
  return {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    imageRatio: null,
  }
}

function getFrameCoverSize(
  imageRatio: CustomCrop["imageRatio"],
  frame: {
    height: number
    width: number
  }
) {
  const ratio =
    typeof imageRatio === "number" && Number.isFinite(imageRatio) && imageRatio > 0
      ? imageRatio
      : 1
  const frameRatio = frame.width / frame.height

  if (ratio >= frameRatio) {
    return {
      height: frame.height,
      width: frame.height * ratio,
    }
  }

  return {
    height: frame.width / ratio,
    width: frame.width,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function pickVariant(product: HttpTypes.StoreProduct) {
  const variants = product.variants ?? []

  return (
    variants.find(isVariantInStock) ??
    variants.find((variant) => Boolean(variant.id))
  )
}

function isVariantInStock(variant: HttpTypes.StoreProductVariant) {
  return Boolean(variant.id)
}

function getNextSlot(usedSlots: number[]) {
  const used = new Set(usedSlots)

  return PLACEMENT_ORDER.find((slot) => !used.has(slot)) ?? 0
}

function buildWallSlots(): WallSlotDefinition[] {
  let slot = 0
  const gridHeight = (WALL_ROWS.length - 1) * WALL_Y_STEP + WALL_SLOT_HEIGHT
  const startY = (WALL_HEIGHT - gridHeight) / 2

  return WALL_ROWS.flatMap((columns, row) => {
    const rowWidth = (columns - 1) * WALL_X_STEP + WALL_SLOT_WIDTH
    const startX = (WALL_WIDTH - rowWidth) / 2

    return Array.from({ length: columns }).map((_, col) => {
      const x = startX + col * WALL_X_STEP
      const y = startY + row * WALL_Y_STEP

      return {
        slot: slot++,
        row,
        col,
        x,
        y,
        centerX: x + WALL_SLOT_WIDTH / 2,
        centerY: y + WALL_SLOT_HEIGHT / 2,
      }
    })
  })
}

function getSlotDistanceFromCenter(slot: WallSlotDefinition) {
  return Math.hypot(slot.centerX - WALL_CENTER.x, slot.centerY - WALL_CENTER.y)
}

function readDragPayload(event: DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_MIME)

  if (!raw) {
    return null
  }

  try {
    const payload = JSON.parse(raw) as Partial<DragPayload>

    if (payload.source === "product" && "productId" in payload) {
      return {
        source: "product",
        productId: String(payload.productId),
      }
    }

    if (payload.source === "wall" && "slot" in payload) {
      const slot = Number(payload.slot)

      if (Number.isInteger(slot)) {
        return {
          source: "wall",
          slot,
        }
      }
    }
  } catch {}

  return null
}

const hexClipPath =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
const cropHexPoints = `50,${CROP_HEX_TOP} ${
  100 - CROP_HEX_SIDE_X
},25 ${100 - CROP_HEX_SIDE_X},75 50,${CROP_HEX_BOTTOM} ${
  CROP_HEX_SIDE_X
},75 ${CROP_HEX_SIDE_X},25`

export default CustomWallTemplate
