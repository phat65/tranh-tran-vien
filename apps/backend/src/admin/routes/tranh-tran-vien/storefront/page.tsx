// Trang admin tùy biến render khu vực tranh tran vien / storefront.

import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { ChangeEvent, FormEvent, ReactNode, useEffect, useState } from "react"

type SiteSetting = {
  id: string
  key: string
  value_json: unknown
  is_public: boolean
  group?: string | null
  description?: string | null
}

type HeroSlideForm = {
  media_type: "image" | "video"
  media_url: string
  media_object_position: string
  link_url: string
}

type LinkOption = {
  label: string
  href: string
  group: string
}

type RuleOption = {
  id: string
  label: string
  subtitle?: string
}

type RuleOptions = {
  products: RuleOption[]
  categories: RuleOption[]
  collections: RuleOption[]
}

type PageRecord = {
  title?: string
  slug?: string
  status?: string
}

type PostRecord = {
  title?: string
  slug?: string
  status?: string
}

type HeroForm = {
  eyebrow: string
  title: string
  body: string
  media_type: "image" | "video"
  media_url: string
  media_aspect_ratio: string
  media_object_position: string
  media_slides: HeroSlideForm[]
  slide_interval_seconds: string
  primary_label: string
  primary_href: string
  secondary_label: string
  secondary_href: string
  background_image_url: string
}

const SETTINGS_API = "/admin/tranh-tran-vien/catalog/site-settings"
const HOME_HERO_KEY = "home_hero"
const NO_LINK_VALUE = "__none__"

const baseLinkOptions: LinkOption[] = [
  { label: "Home", href: "/", group: "Default" },
  { label: "Store", href: "/store", group: "Default" },
  { label: "Build Wall", href: "/custom-wall", group: "Default" },
  { label: "Posts", href: "/posts", group: "Default" },
]

const emptyRuleOptions: RuleOptions = {
  products: [],
  categories: [],
  collections: [],
}

const emptyPagesResponse: { pages: PageRecord[] } = {
  pages: [],
}

const emptyPostsResponse: { posts: PostRecord[] } = {
  posts: [],
}

const defaultHeroForm: HeroForm = {
  eyebrow: "Combo decor for anime, Pokemon and custom walls",
  title: "Build a wall your collection deserves.",
  body: "Pick hexagon art, Pokemon frames or acrylic displays. Combo pricing is applied automatically in the cart.",
  media_type: "image",
  media_url: "",
  media_aspect_ratio: "16 / 9",
  media_object_position: "center center",
  media_slides: [],
  slide_interval_seconds: "5",
  primary_label: "Build Wall",
  primary_href: "/custom-wall",
  secondary_label: "Browse all",
  secondary_href: "/store",
  background_image_url: "",
}

const TtvStorefrontPage = () => {
  const [settingId, setSettingId] = useState<string | null>(null)
  const [form, setForm] = useState<HeroForm>(defaultHeroForm)
  const [linkOptions, setLinkOptions] = useState<LinkOption[]>(baseLinkOptions)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const loadStorefrontData = async () => {
    setIsLoading(true)

    try {
      await Promise.all([loadHero(), loadLinkOptions()])
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load storefront"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const loadLinkOptions = async () => {
    const [ruleOptions, pagesResponse, postsResponse] = await Promise.all([
      adminFetch<RuleOptions>("/admin/tranh-tran-vien/rules/options").catch(
        () => emptyRuleOptions
      ),
      adminFetch<{ pages: PageRecord[] }>(
        "/admin/tranh-tran-vien/business/pages?limit=200"
      ).catch(() => emptyPagesResponse),
      adminFetch<{ posts: PostRecord[] }>(
        "/admin/tranh-tran-vien/business/posts?limit=200"
      ).catch(() => emptyPostsResponse),
    ])

    setLinkOptions([
      ...baseLinkOptions,
      ...ruleOptions.categories
        .filter((option) => option.subtitle)
        .map((option) => ({
          label: option.label,
          href: `/categories/${option.subtitle}`,
          group: "Categories",
        })),
      ...ruleOptions.collections
        .filter((option) => option.subtitle)
        .map((option) => ({
          label: option.label,
          href: `/collections/${option.subtitle}`,
          group: "Collections",
        })),
      ...ruleOptions.products
        .map((option) => ({
          ...option,
          handle: option.subtitle?.split(" / ")[0],
        }))
        .filter((option) => option.handle)
        .map((option) => ({
          label: option.label,
          href: `/products/${option.handle}`,
          group: "Products",
        })),
      ...pagesResponse.pages
        .filter((page) => page.slug)
        .map((page) => ({
          label: page.title ?? page.slug ?? "",
          href: `/pages/${page.slug}`,
          group: "Pages",
        })),
      ...postsResponse.posts
        .filter((post) => post.slug)
        .map((post) => ({
          label: post.title ?? post.slug ?? "",
          href: `/posts/${post.slug}`,
          group: "Posts",
        })),
    ])
  }

  const loadHero = async () => {
    try {
      const response = await apiFetch<{ site_settings: SiteSetting[] }>(
        `?q=${encodeURIComponent(HOME_HERO_KEY)}&limit=50`
      )
      const setting =
        response.site_settings.find((item) => item.key === HOME_HERO_KEY) ??
        null

      setSettingId(setting?.id ?? null)
      setForm(setting ? toHeroForm(setting.value_json) : defaultHeroForm)
    } catch (error) {
      throw error
    }
  }

  const saveHero = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsSaving(true)

    try {
      const slides = normalizeSlides(form)
      const firstSlide = slides[0]
      const payload = {
        key: HOME_HERO_KEY,
        value_json: {
          eyebrow: form.eyebrow.trim(),
          title: form.title.trim(),
          body: form.body.trim(),
          media_type: firstSlide?.media_type ?? form.media_type,
          media_url: firstSlide?.media_url ?? form.media_url.trim(),
          media_aspect_ratio: form.media_aspect_ratio,
          media_object_position:
            firstSlide?.media_object_position ?? form.media_object_position,
          media_slides: slides,
          slide_interval_seconds: Number(form.slide_interval_seconds || 5),
          primary_label: form.primary_label.trim(),
          primary_href: normalizeHref(form.primary_href),
          secondary_label: form.secondary_label.trim(),
          secondary_href: normalizeHref(form.secondary_href),
          background_image_url: firstSlide?.media_url ?? form.media_url.trim(),
        },
        is_public: true,
        group: "storefront",
        description: "Homepage hero banner configuration",
      }

      const result = settingId
        ? await apiFetch<{ site_setting: SiteSetting }>(`/${settingId}`, {
            method: "POST",
            body: JSON.stringify(payload),
          })
        : await apiFetch<{ site_setting: SiteSetting }>("", {
            method: "POST",
            body: JSON.stringify(payload),
          })

      setSettingId(result.site_setting.id)
      setForm(toHeroForm(result.site_setting.value_json))
      toast.success("Hero banner saved")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save hero banner"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const uploadBannerMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsUploading(true)

    try {
      const data = new FormData()
      data.append("files", file)

      const response = await fetch("/admin/uploads?fields=id,url", {
        method: "POST",
        body: data,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Upload failed with status ${response.status}`)
      }

      const result = (await response.json()) as {
        files?: { id: string; url: string }[]
      }
      const uploadedUrl = result.files?.[0]?.url

      if (!uploadedUrl) {
        throw new Error("Upload did not return an image URL")
      }

      setForm((current) => ({
        ...current,
        media_type: file.type.startsWith("video/") ? "video" : "image",
        media_url: uploadedUrl,
        background_image_url: uploadedUrl,
          media_slides: [
          ...current.media_slides,
          {
            media_type: file.type.startsWith("video/") ? "video" : "image",
            media_url: uploadedUrl,
            media_object_position: current.media_object_position,
            link_url: "",
          },
        ],
      }))
      toast.success("Hero media uploaded")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload media"
      )
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  useEffect(() => {
    loadStorefrontData()
  }, [])

  const updateSlide = (index: number, patch: Partial<HeroSlideForm>) => {
    setForm((current) => {
      const media_slides = current.media_slides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, ...patch } : slide
      )
      const firstSlide = media_slides[0]

      return {
        ...current,
        media_slides,
        media_type: firstSlide?.media_type ?? current.media_type,
        media_url: firstSlide?.media_url ?? "",
        media_object_position:
          firstSlide?.media_object_position ?? current.media_object_position,
        background_image_url: firstSlide?.media_url ?? "",
      }
    })
  }

  const removeSlide = (index: number) => {
    setForm((current) => {
      const media_slides = current.media_slides.filter(
        (_, slideIndex) => slideIndex !== index
      )
      const firstSlide = media_slides[0]

      return {
        ...current,
        media_slides,
        media_type: firstSlide?.media_type ?? "image",
        media_url: firstSlide?.media_url ?? "",
        media_object_position:
          firstSlide?.media_object_position ?? "center center",
        background_image_url: firstSlide?.media_url ?? "",
      }
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">TTV Storefront</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Edit the homepage banner shown above the shop sections.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/app/tranh-tran-vien/storefront/categories"
            className="rounded-rounded border border-ui-border-base px-3 py-2 text-small-regular text-ui-fg-subtle transition-colors hover:border-ui-border-strong hover:text-ui-fg-base"
          >
            Category pages
          </a>
          <a
            href="/app/tranh-tran-vien/storefront/explore-items"
            className="rounded-rounded border border-ui-border-base px-3 py-2 text-small-regular text-ui-fg-subtle transition-colors hover:border-ui-border-strong hover:text-ui-fg-base"
          >
            Explore items
          </a>
          <Button
            type="button"
            variant="secondary"
            onClick={loadStorefrontData}
            isLoading={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <form className="grid gap-6 p-6" onSubmit={saveHero}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <Field
              label="Upload hero media"
              description="Each upload adds one banner to the homepage carousel."
            >
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={uploadBannerMedia}
                disabled={isUploading}
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Preview ratio">
                <Select
                  value={form.media_aspect_ratio}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      media_aspect_ratio: value,
                    }))
                  }
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="16 / 9">16:9 wide</Select.Item>
                    <Select.Item value="4 / 3">4:3 standard</Select.Item>
                    <Select.Item value="1 / 1">1:1 square</Select.Item>
                    <Select.Item value="21 / 9">21:9 cinematic</Select.Item>
                  </Select.Content>
                </Select>
              </Field>

              <Field
                label="Slide time"
                description="Seconds before the next banner appears."
              >
                <Input
                  type="number"
                  min={2}
                  value={form.slide_interval_seconds}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slide_interval_seconds: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <Text size="small" weight="plus">
                  Banners
                </Text>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      media_slides: [
                        ...current.media_slides,
                        {
                          media_type: "image",
                          media_url: "",
                          media_object_position: "center center",
                          link_url: "",
                        },
                      ],
                    }))
                  }
                >
                  Add banner
                </Button>
              </div>
              {form.media_slides.length ? (
                form.media_slides.map((slide, index) => (
                  <div
                    key={index}
                    className="grid gap-3 border border-ui-border-base p-3"
                  >
                    <div className="flex items-center justify-between">
                      <Text size="small" weight="plus">
                        Banner {index + 1}
                      </Text>
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={() => removeSlide(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <Field label="Media URL">
                      <Input
                        value={slide.media_url}
                        onChange={(event) =>
                          updateSlide(index, { media_url: event.target.value })
                        }
                        placeholder="https://..."
                      />
                    </Field>
                    <Field
                      label="Banner link"
                      description="Optional. Clicking this banner opens the configured page."
                    >
                      <Select
                        value={slide.link_url || NO_LINK_VALUE}
                        onValueChange={(value) =>
                          updateSlide(index, {
                            link_url: value === NO_LINK_VALUE ? "" : value,
                          })
                        }
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="No link" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value={NO_LINK_VALUE}>No link</Select.Item>
                          {linkOptions.map((option) => (
                            <Select.Item
                              key={`${option.group}:${option.href}`}
                              value={option.href}
                            >
                              {formatLinkOption(option)}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </Field>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Media type">
                        <Select
                          value={slide.media_type}
                          onValueChange={(value) =>
                            updateSlide(index, {
                              media_type:
                                value === "video" ? "video" : "image",
                            })
                          }
                        >
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="image">Image</Select.Item>
                            <Select.Item value="video">Video</Select.Item>
                          </Select.Content>
                        </Select>
                      </Field>

                      <Field label="Image position">
                        <Select
                          value={slide.media_object_position}
                          onValueChange={(value) =>
                            updateSlide(index, {
                              media_object_position: value,
                            })
                          }
                        >
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="center center">Center</Select.Item>
                            <Select.Item value="center top">Top</Select.Item>
                            <Select.Item value="center bottom">Bottom</Select.Item>
                            <Select.Item value="left center">Left</Select.Item>
                            <Select.Item value="right center">Right</Select.Item>
                          </Select.Content>
                        </Select>
                      </Field>
                    </div>
                  </div>
                ))
              ) : (
                <Text className="text-ui-fg-subtle" size="small">
                  No banners yet. Upload media or add a banner URL.
                </Text>
              )}
            </div>
          </div>

        </div>

        {!!form.media_slides.filter((slide) => slide.media_url.trim()).length && (
          <div className="grid gap-3 md:grid-cols-2">
            {form.media_slides
              .filter((slide) => slide.media_url.trim())
              .map((slide, index) => (
                <div
                  key={`${slide.media_url}-${index}`}
                  className="overflow-hidden border border-ui-border-base bg-ui-bg-subtle"
                  style={{ aspectRatio: form.media_aspect_ratio }}
                >
                  {slide.media_type === "video" ? (
                    <video
                      src={slide.media_url}
                      className="h-full w-full object-cover"
                      style={{ objectPosition: slide.media_object_position }}
                      controls
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={slide.media_url}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ objectPosition: slide.media_object_position }}
                    />
                  )}
                </div>
              ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSaving}>
            Save banner
          </Button>
        </div>
      </form>
    </Container>
  )
}

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <label className="grid gap-2">
      <Text size="small" weight="plus">
        {label}
      </Text>
      {description && (
        <Text size="xsmall" className="text-ui-fg-subtle">
          {description}
        </Text>
      )}
      {children}
    </label>
  )
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SETTINGS_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

function formatLinkOption(option: LinkOption): string {
  return `${option.group} / ${option.label}`
}

function toHeroForm(value: unknown): HeroForm {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultHeroForm
  }

  const config = value as Record<string, unknown>
  const legacyMediaUrl =
    getString(config.media_url) ?? getString(config.background_image_url) ?? ""
  const mediaSlides = getHeroSlides(config.media_slides, {
    media_type: getMediaType(config.media_type),
    media_url: legacyMediaUrl,
    media_object_position:
      getObjectPosition(config.media_object_position) ??
      defaultHeroForm.media_object_position,
    link_url: getString(config.primary_href) ?? "",
  })
  const firstSlide = mediaSlides[0]

  return {
    eyebrow: getString(config.eyebrow) ?? defaultHeroForm.eyebrow,
    title: getString(config.title) ?? defaultHeroForm.title,
    body: getString(config.body) ?? defaultHeroForm.body,
    media_type: firstSlide?.media_type ?? getMediaType(config.media_type),
    media_url: firstSlide?.media_url ?? legacyMediaUrl,
    media_aspect_ratio:
      getAspectRatio(config.media_aspect_ratio) ??
      defaultHeroForm.media_aspect_ratio,
    media_object_position:
      firstSlide?.media_object_position ??
      getObjectPosition(config.media_object_position) ??
      defaultHeroForm.media_object_position,
    media_slides: mediaSlides,
    slide_interval_seconds: String(
      getPositiveNumber(config.slide_interval_seconds) ?? 5
    ),
    primary_label:
      getString(config.primary_label) ?? defaultHeroForm.primary_label,
    primary_href: getString(config.primary_href) ?? defaultHeroForm.primary_href,
    secondary_label:
      getString(config.secondary_label) ?? defaultHeroForm.secondary_label,
    secondary_href:
      getString(config.secondary_href) ?? defaultHeroForm.secondary_href,
    background_image_url:
      getString(config.background_image_url) ?? getString(config.media_url) ?? "",
  }
}

function normalizeSlides(form: HeroForm): HeroSlideForm[] {
  const slides = form.media_slides
    .map((slide) => ({
      media_type: slide.media_type,
      media_url: slide.media_url.trim(),
      media_object_position:
        getObjectPosition(slide.media_object_position) ?? "center center",
      link_url: normalizeOptionalHref(slide.link_url),
    }))
    .filter((slide) => slide.media_url)

  if (slides.length) {
    return slides
  }

  const legacyUrl = form.media_url.trim() || form.background_image_url.trim()

  return legacyUrl
    ? [
        {
          media_type: form.media_type,
          media_url: legacyUrl,
          media_object_position: form.media_object_position,
          link_url: normalizeOptionalHref(form.primary_href),
        },
      ]
    : []
}

function getHeroSlides(
  value: unknown,
  fallback: HeroSlideForm
): HeroSlideForm[] {
  if (Array.isArray(value)) {
    const slides = value
      .map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return null
        }

        const slide = entry as Record<string, unknown>
        const mediaUrl = getString(slide.media_url)

        if (!mediaUrl) {
          return null
        }

        return {
          media_type: getMediaType(slide.media_type),
          media_url: mediaUrl,
          media_object_position:
            getObjectPosition(slide.media_object_position) ?? "center center",
          link_url:
            normalizeOptionalHref(getString(slide.link_url) ?? "") ||
            normalizeOptionalHref(getString(slide.href) ?? ""),
        }
      })
      .filter((slide): slide is HeroSlideForm => Boolean(slide))

    if (slides.length) {
      return slides
    }
  }

  return fallback.media_url ? [fallback] : []
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function getPositiveNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value)

  return Number.isFinite(number) && number > 0 ? number : null
}

function getMediaType(value: unknown): "image" | "video" {
  return value === "video" ? "video" : "image"
}

function getAspectRatio(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  return ["16 / 9", "4 / 3", "1 / 1", "21 / 9"].includes(value)
    ? value
    : null
}

function getObjectPosition(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  return [
    "center center",
    "center top",
    "center bottom",
    "left center",
    "right center",
  ].includes(value)
    ? value
    : null
}

function normalizeHref(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    return ""
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("http")) {
    return trimmed
  }

  return `/${trimmed}`
}

function normalizeOptionalHref(value: string): string {
  return value.trim() ? normalizeHref(value) : ""
}

export const config = defineRouteConfig({
  label: "TTV Storefront",
  rank: 30,
})

export default TtvStorefrontPage
