export type OrderLineItemSnapshot = {
  id: string
  title?: string | null
  product_title?: string | null
  metadata?: Record<string, unknown> | null
}

export type CustomArtworkSelection = {
  lineItemId: string
  displayTitle: string
  imageUrl: string
  filename: string
  sourceLabel: string
  crop: CustomArtworkCrop
}

export type CustomArtworkCrop = {
  offsetX: number
  offsetY: number
  zoom: number
  imageRatio: number | null
}

export type CustomArtworkCropExport = {
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  outputWidth: number
  outputHeight: number
}

export const CUSTOM_ARTWORK_CROP_FRAME_WIDTH = 340
export const CUSTOM_ARTWORK_CROP_FRAME_HEIGHT = 390
export const CUSTOM_ARTWORK_HEX_CLIP_PATH =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"

const CROP_MIN_ZOOM = 1
const CROP_MAX_ZOOM = 4

export function getCustomArtworkSelection(
  item: OrderLineItemSnapshot,
): CustomArtworkSelection | null {
  const metadata = item.metadata
  const imageUrl = getSafeImageUrl(metadata?.ttv_custom_image_url)

  if (!imageUrl) {
    return null
  }

  const source = getString(metadata?.ttv_source)

  return {
    lineItemId: item.id,
    displayTitle:
      getString(metadata?.ttv_custom_display_title) ??
      item.product_title ??
      item.title ??
      "Custom artwork",
    imageUrl,
    filename:
      getString(metadata?.ttv_custom_original_filename) ??
      `custom-artwork-${item.id}`,
    sourceLabel:
      source === "custom_wall"
        ? "Custom wall"
        : source === "custom_hexagon_page"
          ? "Custom hexagon"
          : "Customer upload",
    crop: getCustomArtworkCrop(metadata?.ttv_crop),
  }
}

export function getCustomArtworkCrop(value: unknown): CustomArtworkCrop {
  const crop = isRecord(value) ? value : {}

  return clampCustomArtworkCrop({
    offsetX: getFiniteNumber(crop.offsetX, 0),
    offsetY: getFiniteNumber(crop.offsetY, 0),
    zoom: getFiniteNumber(crop.zoom, 1),
    imageRatio: getPositiveNumber(crop.imageRatio),
  })
}

export function getCustomArtworkCropPreviewStyle(crop: CustomArtworkCrop) {
  const normalized = clampCustomArtworkCrop(crop)
  const baseSize = getFrameCoverSize(normalized.imageRatio)

  return {
    height: `${(baseSize.height / CUSTOM_ARTWORK_CROP_FRAME_HEIGHT) * 100}%`,
    left: `calc(50% + ${
      (normalized.offsetX / CUSTOM_ARTWORK_CROP_FRAME_WIDTH) * 100
    }%)`,
    top: `calc(50% + ${
      (normalized.offsetY / CUSTOM_ARTWORK_CROP_FRAME_HEIGHT) * 100
    }%)`,
    transform: `translate(-50%, -50%) scale(${normalized.zoom})`,
    width: `${(baseSize.width / CUSTOM_ARTWORK_CROP_FRAME_WIDTH) * 100}%`,
  }
}

export function getCustomArtworkCropExport(
  crop: CustomArtworkCrop,
  naturalWidth: number,
  naturalHeight: number,
): CustomArtworkCropExport | null {
  if (
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(naturalHeight) ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return null
  }

  const normalized = clampCustomArtworkCrop(crop)
  const baseSize = getFrameCoverSize(normalized.imageRatio)
  const drawnWidth = baseSize.width * normalized.zoom
  const drawnHeight = baseSize.height * normalized.zoom
  const sourceWidth =
    (CUSTOM_ARTWORK_CROP_FRAME_WIDTH * naturalWidth) / drawnWidth
  const sourceHeight =
    (CUSTOM_ARTWORK_CROP_FRAME_HEIGHT * naturalHeight) / drawnHeight
  const sourceX =
    (drawnWidth / 2 -
      CUSTOM_ARTWORK_CROP_FRAME_WIDTH / 2 -
      normalized.offsetX) *
    (naturalWidth / drawnWidth)
  const sourceY =
    (drawnHeight / 2 -
      CUSTOM_ARTWORK_CROP_FRAME_HEIGHT / 2 -
      normalized.offsetY) *
    (naturalHeight / drawnHeight)
  const outputScale = Math.min(
    sourceWidth / CUSTOM_ARTWORK_CROP_FRAME_WIDTH,
    sourceHeight / CUSTOM_ARTWORK_CROP_FRAME_HEIGHT,
  )
  const safeSourceWidth = Math.min(sourceWidth, naturalWidth)
  const safeSourceHeight = Math.min(sourceHeight, naturalHeight)

  return {
    sourceX: clamp(sourceX, 0, naturalWidth - safeSourceWidth),
    sourceY: clamp(sourceY, 0, naturalHeight - safeSourceHeight),
    sourceWidth: safeSourceWidth,
    sourceHeight: safeSourceHeight,
    outputWidth: Math.max(
      1,
      Math.floor(CUSTOM_ARTWORK_CROP_FRAME_WIDTH * outputScale),
    ),
    outputHeight: Math.max(
      1,
      Math.floor(CUSTOM_ARTWORK_CROP_FRAME_HEIGHT * outputScale),
    ),
  }
}

function clampCustomArtworkCrop(crop: CustomArtworkCrop): CustomArtworkCrop {
  const zoom = clamp(crop.zoom, CROP_MIN_ZOOM, CROP_MAX_ZOOM)
  const baseSize = getFrameCoverSize(crop.imageRatio)
  const maxOffsetX = Math.max(
    0,
    (baseSize.width * zoom - CUSTOM_ARTWORK_CROP_FRAME_WIDTH) / 2,
  )
  const maxOffsetY = Math.max(
    0,
    (baseSize.height * zoom - CUSTOM_ARTWORK_CROP_FRAME_HEIGHT) / 2,
  )

  return {
    ...crop,
    offsetX: clamp(crop.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(crop.offsetY, -maxOffsetY, maxOffsetY),
    zoom,
  }
}

function getFrameCoverSize(imageRatio: CustomArtworkCrop["imageRatio"]) {
  const ratio = imageRatio ?? 1
  const frameRatio =
    CUSTOM_ARTWORK_CROP_FRAME_WIDTH / CUSTOM_ARTWORK_CROP_FRAME_HEIGHT

  if (ratio >= frameRatio) {
    return {
      height: CUSTOM_ARTWORK_CROP_FRAME_HEIGHT,
      width: CUSTOM_ARTWORK_CROP_FRAME_HEIGHT * ratio,
    }
  }

  return {
    height: CUSTOM_ARTWORK_CROP_FRAME_WIDTH / ratio,
    width: CUSTOM_ARTWORK_CROP_FRAME_WIDTH,
  }
}

function getSafeImageUrl(value: unknown): string | null {
  const url = getString(value)

  if (!url) {
    return null
  }

  if (url.startsWith("/") && !url.startsWith("//")) {
    return url
  }

  try {
    const parsed = new URL(url)

    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? url
      : null
  } catch {
    return null
  }
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function getFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function getPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
