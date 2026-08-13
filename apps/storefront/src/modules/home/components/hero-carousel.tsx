"use client"

// Component giao diện xử lý phần hero carousel trong storefront.

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
  const showControls = slides.length > 1

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

  const goToPreviousSlide = () => {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
  }

  const goToNextSlide = () => {
    setActiveIndex((current) => (current + 1) % slides.length)
  }

  return (
    <section className="group relative h-[calc(100dvh-4rem)] min-h-[28rem] max-h-[760px] overflow-hidden border-b border-ui-border-base bg-[#141414]">
      {slides.length ? (
        <div
          className="flex h-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div className="relative h-full w-full shrink-0" key={index}>
              <HeroMedia slide={slide} priority={index === 0} />
            </div>
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 bg-[#202327]" />
      )}
      {activeSlide?.link_url && <BannerLinkOverlay href={activeSlide.link_url} />}

      {showControls && (
        <>
          <button
            type="button"
            className="absolute left-4 top-1/2 z-20 flex h-16 w-11 -translate-y-1/2 items-center justify-center rounded-md bg-black/55 text-4xl leading-none text-white opacity-0 shadow-lg backdrop-blur transition-all hover:bg-black/75 group-hover:opacity-100 small:left-8"
            onClick={goToPreviousSlide}
            aria-label="Previous banner"
          >
            <span className="-translate-y-[2px]" aria-hidden="true">
              ‹
            </span>
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 z-20 flex h-16 w-11 -translate-y-1/2 items-center justify-center rounded-md bg-black/55 text-4xl leading-none text-white opacity-0 shadow-lg backdrop-blur transition-all hover:bg-black/75 group-hover:opacity-100 small:right-8"
            onClick={goToNextSlide}
            aria-label="Next banner"
          >
            <span className="-translate-y-[2px]" aria-hidden="true">
              ›
            </span>
          </button>
        </>
      )}

      {showControls && (
        <div className="pointer-events-none absolute inset-x-0 bottom-7 z-20 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/25 px-3 py-2 backdrop-blur">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`h-1 transition-all ${
                  activeIndex === index
                    ? "w-10 bg-white"
                    : "w-5 bg-white/45 hover:bg-white/75"
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

function BannerLinkOverlay({ href }: { href: string }) {
  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        className="absolute inset-0 z-10"
        aria-label="Open banner link"
      >
        <span className="sr-only">Open banner link</span>
      </a>
    )
  }

  return (
    <LocalizedClientLink
      href={href}
      className="absolute inset-0 z-10"
      aria-label="Open banner link"
    >
      <span className="sr-only">Open banner link</span>
    </LocalizedClientLink>
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
          link_url: config.primary_href,
        },
      ]
    : []
}

export default HomeHeroCarousel
