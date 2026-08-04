"use client"

import type { TtvHomeHeroConfig, TtvHomeHeroSlide } from "@lib/data/ttv"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

type HomeHeroCarouselProps = {
  config: TtvHomeHeroConfig
  fallbackMediaUrl?: string | null
}

const HomeHeroCarousel = ({
  config,
  fallbackMediaUrl,
}: HomeHeroCarouselProps) => {
  const slides = useMemo(
    () => getSlides(config, fallbackMediaUrl),
    [config, fallbackMediaUrl]
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const activeSlide = slides[activeIndex] ?? slides[0]

  useEffect(() => {
    setActiveIndex(0)
  }, [slides.length])

  useEffect(() => {
    if (slides.length < 2) {
      return
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, Math.max(2, config.slide_interval_seconds) * 1000)

    return () => window.clearInterval(interval)
  }, [config.slide_interval_seconds, slides.length])

  return (
    <section className="relative min-h-[calc(100dvh-4rem)] overflow-hidden border-b border-ui-border-base bg-[#141414] text-white">
      {activeSlide ? (
        <HeroMedia slide={activeSlide} priority={activeIndex === 0} />
      ) : (
        <div className="absolute inset-0 bg-[#202327]" />
      )}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="content-container relative flex min-h-[calc(100dvh-4rem)] items-center py-14">
        <div className="max-w-[39rem]">
          <p className="txt-compact-small-plus mb-4 text-white/78">
            {config.eyebrow}
          </p>
          <h1 className="text-[2.75rem] font-semibold leading-[0.96] tracking-normal small:text-[4.75rem]">
            {config.title}
          </h1>
          <p className="mt-6 max-w-[32rem] text-base leading-7 text-white/78">
            {config.body}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LocalizedClientLink
              href={config.primary_href}
              className="inline-flex h-11 items-center justify-center bg-white px-5 text-small-regular text-ui-fg-base transition-colors hover:bg-white/86"
            >
              {config.primary_label}
            </LocalizedClientLink>
            <LocalizedClientLink
              href={config.secondary_href}
              className="inline-flex h-11 items-center justify-center border border-white/60 px-5 text-small-regular text-white transition-colors hover:bg-white/12"
            >
              {config.secondary_label}
            </LocalizedClientLink>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-7 z-10 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-2 backdrop-blur">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`h-2.5 rounded-full transition-all ${
                  activeIndex === index
                    ? "w-7 bg-white"
                    : "w-2.5 bg-white/45 hover:bg-white/75"
                }`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show banner ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function HeroMedia({
  slide,
  priority,
}: {
  slide: TtvHomeHeroSlide
  priority: boolean
}) {
  if (slide.media_type === "video") {
    return (
      <video
        src={slide.media_url}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: slide.media_object_position }}
        autoPlay
        loop
        muted
        playsInline
      />
    )
  }

  return (
    <Image
      src={slide.media_url}
      alt=""
      className="object-cover"
      style={{ objectPosition: slide.media_object_position }}
      sizes="100vw"
      priority={priority}
      fill
    />
  )
}

function HeroFact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold leading-none text-white">{value}</p>
      <p className="mt-1 text-small-regular">{label}</p>
    </div>
  )
}

function getSlides(
  config: TtvHomeHeroConfig,
  fallbackMediaUrl?: string | null
): TtvHomeHeroSlide[] {
  if (config.media_slides.length) {
    return config.media_slides
  }

  const mediaUrl = config.media_url ?? config.background_image_url ?? fallbackMediaUrl

  return mediaUrl
    ? [
        {
          media_type: config.media_type,
          media_url: mediaUrl,
          media_object_position: config.media_object_position,
        },
      ]
    : []
}

export default HomeHeroCarousel
