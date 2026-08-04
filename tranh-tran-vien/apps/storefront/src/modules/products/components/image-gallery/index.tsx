"use client"

import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import Image from "next/image"
import { useMemo, useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const galleryImages = useMemo(
    () => images.filter((image) => !!image.url),
    [images]
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = galleryImages[activeIndex] ?? galleryImages[0]

  if (!activeImage?.url) {
    return (
      <div className="aspect-square w-full rounded-lg bg-[#f2f0f1]" />
    )
  }

  return (
    <div className="w-full">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#f2f0f1] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-[9%]">
          <div className="relative h-full w-full overflow-hidden [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)]">
            <Image
              src={activeImage.url}
              priority
              className="object-cover object-center"
              alt="Product image"
              fill
              sizes="(max-width: 768px) 92vw, (max-width: 1200px) 48vw, 680px"
            />
          </div>
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
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-[#f2f0f1] transition-colors",
                index === activeIndex
                  ? "border-[#ffcc00]"
                  : "border-ui-border-base hover:border-ui-border-strong"
              )}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show product image ${index + 1}`}
            >
              {image.url && (
                <Image
                  src={image.url}
                  className="object-cover object-center"
                  alt=""
                  fill
                  sizes="64px"
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
