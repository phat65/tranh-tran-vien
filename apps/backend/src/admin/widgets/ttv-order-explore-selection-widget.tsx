import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"

import {
  CUSTOM_ARTWORK_CROP_FRAME_HEIGHT,
  CUSTOM_ARTWORK_CROP_FRAME_WIDTH,
  CUSTOM_ARTWORK_HEX_CLIP_PATH,
  getCustomArtworkCropExport,
  getCustomArtworkCropPreviewStyle,
  getCustomArtworkSelection,
  type CustomArtworkSelection,
} from "../lib/order-custom-artwork"

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
  const customArtworks = (data?.items ?? [])
    .map(getCustomArtworkSelection)
    .filter((artwork): artwork is CustomArtworkSelection => Boolean(artwork))

  if (!selections.length && !customArtworks.length) {
    return null
  }

  return (
    <div className="grid gap-4">
      {customArtworks.length ? (
        <CustomArtworkSection artworks={customArtworks} />
      ) : null}
      {selections.length ? (
        <ImageProductSection selections={selections} />
      ) : null}
    </div>
  )
}

function CustomArtworkSection({
  artworks,
}: {
  artworks: CustomArtworkSelection[]
}) {
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Customer-uploaded artwork</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          The preview and cropped PNG reproduce the crop selected by the
          customer. The original file remains available for reference.
        </Text>
      </div>
      <div className="grid gap-4 p-6">
        {artworks.map((artwork) => (
          <CustomArtworkCard key={artwork.lineItemId} artwork={artwork} />
        ))}
      </div>
    </Container>
  )
}

function CustomArtworkCard({ artwork }: { artwork: CustomArtworkSelection }) {
  const [isDownloading, setIsDownloading] = useState(false)

  const downloadCrop = async () => {
    setIsDownloading(true)

    try {
      await downloadCustomerCrop(artwork)
      toast.success("Customer crop downloaded")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not download the customer crop",
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <article className="grid min-w-0 gap-4 rounded-rounded border border-ui-border-base p-4 md:grid-cols-[minmax(200px,280px)_minmax(0,1fr)]">
      <div className="grid place-items-center rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-4">
        <div
          className="relative w-full max-w-[244px] overflow-hidden bg-ui-bg-base"
          style={{
            aspectRatio: `${CUSTOM_ARTWORK_CROP_FRAME_WIDTH} / ${CUSTOM_ARTWORK_CROP_FRAME_HEIGHT}`,
            clipPath: CUSTOM_ARTWORK_HEX_CLIP_PATH,
          }}
        >
          <img
            src={artwork.imageUrl}
            alt={`${artwork.displayTitle} - customer crop`}
            loading="lazy"
            className="absolute max-w-none select-none"
            style={getCustomArtworkCropPreviewStyle(artwork.crop)}
          />
        </div>
        <Text size="xsmall" className="mt-2 text-ui-fg-subtle">
          Customer crop
        </Text>
      </div>
      <div className="grid min-w-0 content-center gap-2">
        <Text size="large" weight="plus">
          {artwork.displayTitle}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          {artwork.sourceLabel}
        </Text>
        <Text size="small" className="break-all">
          Original file: {artwork.filename}
        </Text>
        <Text size="xsmall" className="text-ui-fg-subtle">
          Crop: zoom {formatCropNumber(artwork.crop.zoom)} · X{" "}
          {formatCropNumber(artwork.crop.offsetX)} · Y{" "}
          {formatCropNumber(artwork.crop.offsetY)}
        </Text>
        <Text size="xsmall" className="text-ui-fg-subtle">
          Line item: {artwork.lineItemId}
        </Text>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="small" onClick={downloadCrop} isLoading={isDownloading}>
            Download customer crop
          </Button>
          <Button size="small" variant="secondary" asChild>
            <a href={artwork.imageUrl} target="_blank" rel="noreferrer">
              View original
            </a>
          </Button>
          <Button size="small" variant="secondary" asChild>
            <a
              href={artwork.imageUrl}
              download={artwork.filename}
              target="_blank"
              rel="noreferrer"
            >
              Download original
            </a>
          </Button>
        </div>
      </div>
    </article>
  )
}

async function downloadCustomerCrop(artwork: CustomArtworkSelection) {
  const sourceObjectUrl = await getProxiedArtworkObjectUrl(artwork.imageUrl)

  try {
    const image = await loadImage(sourceObjectUrl)
    const cropExport = getCustomArtworkCropExport(
      artwork.crop,
      image.naturalWidth,
      image.naturalHeight,
    )

    if (!cropExport) {
      throw new Error("The source image has an invalid size")
    }

    const canvas = document.createElement("canvas")
    canvas.width = cropExport.outputWidth
    canvas.height = cropExport.outputHeight

    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("This browser cannot create the cropped image")
    }

    clipHexagon(context, canvas.width, canvas.height)
    context.drawImage(
      image,
      cropExport.sourceX,
      cropExport.sourceY,
      cropExport.sourceWidth,
      cropExport.sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    const blob = await canvasToPng(canvas)
    downloadBlob(blob, getCustomerCropFilename(artwork.filename))
  } finally {
    URL.revokeObjectURL(sourceObjectUrl)
  }
}

async function getProxiedArtworkObjectUrl(sourceUrl: string) {
  const response = await fetch(
    `/admin/tranh-tran-vien/custom-artwork/source?url=${encodeURIComponent(
      sourceUrl,
    )}`,
    { credentials: "include" },
  )

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : "Could not load the original artwork for cropping"

    throw new Error(message)
  }

  return URL.createObjectURL(await response.blob())
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not load the original image"))
    image.src = url
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

function clipHexagon(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.beginPath()
  context.moveTo(width / 2, 0)
  context.lineTo(width, height * 0.25)
  context.lineTo(width, height * 0.75)
  context.lineTo(width / 2, height)
  context.lineTo(0, height * 0.75)
  context.lineTo(0, height * 0.25)
  context.closePath()
  context.clip()
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error("Could not create the cropped PNG"))
      }, "image/png")
    } catch {
      reject(
        new Error(
          "Storage blocked cropped-image export. Download the original or allow CORS for the storage domain.",
        ),
      )
    }
  })
}

function getCustomerCropFilename(filename: string) {
  const base = filename.replace(/\.[^/.]+$/, "").trim() || "custom-artwork"

  return `${base}-customer-crop.png`
}

function formatCropNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function ImageProductSection({
  selections,
}: {
  selections: ExploreSelection[]
}) {
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
                  Explore:{" "}
                  {[selection.groupLabel, selection.itemName]
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
    imageName: getString(metadata?.ttv_explore_image_name) ?? imageCode,
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
