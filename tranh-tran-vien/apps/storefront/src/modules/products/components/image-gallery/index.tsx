"use client"

import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import Image from "next/image"
import { useMemo, useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const HEX_CLIP_PATH =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const galleryImages = useMemo(
    () => images.filter((image) => !!image.url),
    [images]
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = galleryImages[activeIndex] ?? galleryImages[0]

  if (!activeImage?.url) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-[#f5f6f1]">
        <div
          className="aspect-[86/100] w-[72%] bg-[#d9ded1] opacity-60"
          style={{ clipPath: HEX_CLIP_PATH }}
        />
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-[#f5f6f1] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div
          className="relative aspect-[86/100] w-[72%] overflow-hidden bg-[#d9ded1] shadow-[0_18px_45px_rgba(40,50,30,0.12)]"
          style={{ clipPath: HEX_CLIP_PATH }}
        >
          <Image
            src={activeImage.url}
            priority
            className="object-cover object-center"
            alt="Product image"
            fill
            sizes="(max-width: 768px) 66vw, (max-width: 1200px) 36vw, 500px"
          />
        </div>
        <button
          type="button"
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-elevation-card-rest"
          aria-label="Zoom product image"
        >
          +
        </button>
      </div>

      {galleryImages.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {galleryImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={clx(
                "relative h-[70px] w-[60px] shrink-0 overflow-hidden border bg-[#f5f6f1] transition-colors",
                index === activeIndex
                  ? "border-[#7fb51d]"
                  : "border-ui-border-base hover:border-ui-border-strong"
              )}
              style={{ clipPath: HEX_CLIP_PATH }}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show product image ${index + 1}`}
            >
              {image.url && (
                <Image
                  src={image.url}
                  className="object-cover object-center"
                  alt=""
                  fill
                  sizes="60px"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageGallery
