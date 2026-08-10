"use client"

import { HttpTypes } from "@medusajs/types"

type CustomLineItemThumbnailProps = {
  item: HttpTypes.StoreCartLineItem
}

const HEX_CLIP_PATH =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
const CROP_FRAME_WIDTH = 340
const CROP_FRAME_HEIGHT = 390
const CROP_MIN_ZOOM = 1
const CROP_MAX_ZOOM = 4

type CustomCrop = {
  offsetX: number
  offsetY: number
  zoom: number
  imageRatio?: number | null
}

const CustomLineItemThumbnail = ({ item }: CustomLineItemThumbnailProps) => {
  const imageUrl = getCustomImageUrl(item)

  if (!imageUrl) {
    return null
  }

  const crop = getCustomCrop(item)

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-[#f2f0f1]">
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden bg-[#e4e7df]"
        style={{
          clipPath: HEX_CLIP_PATH,
          height: "86%",
          transform: "translate(-50%, -50%)",
          width: "74%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Custom preview"
          className="absolute max-w-none select-none"
          draggable={false}
          style={buildResponsiveCropImageStyle(crop)}
        />
      </div>
    </div>
  )
}

function getCustomImageUrl(item: HttpTypes.StoreCartLineItem) {
  const value = item.metadata?.ttv_custom_image_url

  return typeof value === "string" && value ? value : null
}

function getCustomCrop(item: HttpTypes.StoreCartLineItem): CustomCrop {
  const value = item.metadata?.ttv_crop

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
      imageRatio: null,
    }
  }

  const crop = value as Record<string, unknown>

  return {
    offsetX: toNumber(crop.offsetX, 0),
    offsetY: toNumber(crop.offsetY, 0),
    zoom: toNumber(crop.zoom, 1),
    imageRatio:
      typeof crop.imageRatio === "number" && Number.isFinite(crop.imageRatio)
        ? crop.imageRatio
        : null,
  }
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function buildResponsiveCropImageStyle(crop: CustomCrop) {
  const normalized = clampCrop(crop)
  const baseSize = getFrameCoverSize(normalized.imageRatio)

  return {
    height: `${(baseSize.height / CROP_FRAME_HEIGHT) * 100}%`,
    left: `calc(50% + ${
      (normalized.offsetX / CROP_FRAME_WIDTH) * 100
    }%)`,
    top: `calc(50% + ${
      (normalized.offsetY / CROP_FRAME_HEIGHT) * 100
    }%)`,
    transform: `translate(-50%, -50%) scale(${normalized.zoom})`,
    width: `${(baseSize.width / CROP_FRAME_WIDTH) * 100}%`,
  }
}

function clampCrop(crop: CustomCrop): CustomCrop {
  const zoom = clamp(crop.zoom, CROP_MIN_ZOOM, CROP_MAX_ZOOM)
  const baseSize = getFrameCoverSize(crop.imageRatio)
  const maxOffsetX = Math.max(
    0,
    (baseSize.width * zoom - CROP_FRAME_WIDTH) / 2
  )
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

function getFrameCoverSize(imageRatio: CustomCrop["imageRatio"]) {
  const ratio =
    typeof imageRatio === "number" && Number.isFinite(imageRatio) && imageRatio > 0
      ? imageRatio
      : 1
  const frameRatio = CROP_FRAME_WIDTH / CROP_FRAME_HEIGHT

  if (ratio >= frameRatio) {
    return {
      height: CROP_FRAME_HEIGHT,
      width: CROP_FRAME_HEIGHT * ratio,
    }
  }

  return {
    height: CROP_FRAME_WIDTH / ratio,
    width: CROP_FRAME_WIDTH,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default CustomLineItemThumbnail
