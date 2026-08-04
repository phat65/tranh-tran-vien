"use server"

import { sdk } from "@lib/config"

export type TtvNavigationMenu = {
  id: string
  code: string
  name: string
  status: "draft" | "active" | "archived"
}

export type TtvNavigationItem = {
  id: string
  menu_id: string
  parent_id?: string | null
  label: string
  link_type:
    | "url"
    | "product"
    | "category"
    | "brand"
    | "taxonomy"
    | "page"
    | "post"
  entity_id?: string | null
  url?: string | null
  sort_order: number
  visibility: "visible" | "hidden"
}

export type TtvSiteSetting = {
  id: string
  key: string
  value_json: unknown
  is_public: boolean
  group?: string | null
  description?: string | null
}

export type TtvPost = {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  content_json?: unknown
  cover_image_url?: string | null
  status: "draft" | "published" | "archived"
  published_at?: string | null
  seo_title?: string | null
  seo_description?: string | null
}

export type TtvPage = {
  id: string
  title: string
  slug: string
  page_type: string
  content_json?: unknown
  status: "draft" | "published" | "archived"
  published_at?: string | null
  seo_title?: string | null
  seo_description?: string | null
}

export type TtvFeedback = {
  id: string
  customer_name: string
  product_id?: string | null
  order_id?: string | null
  rating: number
  content?: string | null
  status: "draft" | "pending_review" | "approved" | "rejected" | "archived"
  published_at?: string | null
}

export type TtvComboTier = {
  minimum_quantity: number
  discount_type: "percentage" | "fixed" | "fixed_total"
  discount_value: number
  label?: string | null
  is_featured?: boolean
  is_free_shipping?: boolean
}

export type TtvComboRule = {
  id: string
  name: string
  description?: string | null
  scope_type: "all" | "product" | "category" | "collection" | "option"
  product_id?: string | null
  category_id?: string | null
  collection_id?: string | null
  option_value_id?: string | null
  sales_channel_id?: string | null
  region_id?: string | null
  tiers: TtvComboTier[]
  priority: number
  is_stackable: boolean
  starts_at?: string | null
  ends_at?: string | null
  status: "draft" | "active" | "archived"
}

export type TtvHomeHeroConfig = {
  eyebrow: string
  title: string
  body: string
  media_type: "image" | "video"
  media_url?: string | null
  media_aspect_ratio: string
  media_object_position: string
  media_slides: TtvHomeHeroSlide[]
  slide_interval_seconds: number
  primary_label: string
  primary_href: string
  secondary_label: string
  secondary_href: string
  background_image_url?: string | null
}

export type TtvHomeHeroSlide = {
  media_type: "image" | "video"
  media_url: string
  media_object_position: string
}

export type TtvCategoryPageConfig = {
  eyebrow: string
  title?: string | null
  intro?: string | null
  media_type: "image" | "video"
  media_url?: string | null
  media_aspect_ratio: string
  banner_image_url?: string | null
  promo_title: string
  promo_body: string
  search_placeholder: string
  topic_label: string
}

const defaultHomeHeroConfig: TtvHomeHeroConfig = {
  eyebrow: "Combo decor for anime, Pokemon and custom walls",
  title: "Build a wall your collection deserves.",
  body: "Pick hexagon art, Pokemon frames or acrylic displays. Combo pricing is applied automatically in the cart.",
  media_type: "image",
  media_url: null,
  media_aspect_ratio: "16 / 9",
  media_object_position: "center center",
  media_slides: [],
  slide_interval_seconds: 5,
  primary_label: "Shop combos",
  primary_href: "/combo",
  secondary_label: "Browse all",
  secondary_href: "/store",
  background_image_url: null,
}

const defaultCategoryPageConfig: TtvCategoryPageConfig = {
  eyebrow: "",
  title: null,
  intro: null,
  media_type: "image",
  media_url: null,
  media_aspect_ratio: "16 / 9",
  banner_image_url: null,
  promo_title: "Combo duoc tu dong tinh trong gio hang.",
  promo_body:
    "Chon nhieu mau trong cung mot dong san pham, uu dai se duoc ap dung khi du dieu kien.",
  search_placeholder: "Tim ten tranh, chu de hoac ma san pham",
  topic_label: "Chu de",
}

export async function getTtvNavigationMenu(code: string) {
  return sdk.client
    .fetch<{
      navigation_menu: TtvNavigationMenu | null
      navigation_items: TtvNavigationItem[]
    }>(`/store/tranh-tran-vien/catalog/navigation-menus/${code}`, {
      cache: "no-store",
    })
    .then((response) => ({
      navigation_menu: response.navigation_menu ?? null,
      navigation_items: Array.isArray(response.navigation_items)
        ? response.navigation_items
        : [],
    }))
    .catch(() => ({
      navigation_menu: null,
      navigation_items: [],
    }))
}

export async function listTtvSiteSettings() {
  return sdk.client
    .fetch<{ site_settings: TtvSiteSetting[] }>(
      "/store/tranh-tran-vien/catalog/site-settings",
      {
        query: { limit: 200 },
        cache: "no-store",
      }
    )
    .then(({ site_settings }) => site_settings)
    .catch(() => [])
}

export async function getTtvSiteConfig() {
  const settings = await listTtvSiteSettings()
  const byKey = new Map(settings.map((setting) => [setting.key, setting]))

  return {
    siteName:
      getSettingString(byKey, "site_name") ??
      getSettingString(byKey, "brand_name") ??
      "Medusa Store",
    footerText:
      getSettingString(byKey, "footer_text") ??
      "All rights reserved.",
  }
}

export async function getTtvHomeHeroConfig(): Promise<TtvHomeHeroConfig> {
  const settings = await listTtvSiteSettings()
  const byKey = new Map(settings.map((setting) => [setting.key, setting]))
  const value = byKey.get("home_hero")?.value_json

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultHomeHeroConfig
  }

  const config = value as Record<string, unknown>
  const legacyMediaUrl =
    getString(config.media_url) ?? getString(config.background_image_url)
  const mediaSlides = getHomeHeroSlides(config.media_slides, {
    media_type: getMediaType(config.media_type),
    media_url: legacyMediaUrl ?? "",
    media_object_position:
      getString(config.media_object_position) ??
      defaultHomeHeroConfig.media_object_position,
  })

  return {
    eyebrow:
      getString(config.eyebrow) ?? defaultHomeHeroConfig.eyebrow,
    title: getString(config.title) ?? defaultHomeHeroConfig.title,
    body: getString(config.body) ?? defaultHomeHeroConfig.body,
    media_type: mediaSlides[0]?.media_type ?? getMediaType(config.media_type),
    media_url: mediaSlides[0]?.media_url ?? legacyMediaUrl,
    media_aspect_ratio:
      getString(config.media_aspect_ratio) ??
      defaultHomeHeroConfig.media_aspect_ratio,
    media_object_position:
      mediaSlides[0]?.media_object_position ??
      getString(config.media_object_position) ??
      defaultHomeHeroConfig.media_object_position,
    media_slides: mediaSlides,
    slide_interval_seconds:
      getPositiveNumber(config.slide_interval_seconds) ??
      defaultHomeHeroConfig.slide_interval_seconds,
    primary_label:
      getString(config.primary_label) ?? defaultHomeHeroConfig.primary_label,
    primary_href:
      getString(config.primary_href) ?? defaultHomeHeroConfig.primary_href,
    secondary_label:
      getString(config.secondary_label) ?? defaultHomeHeroConfig.secondary_label,
    secondary_href:
      getString(config.secondary_href) ?? defaultHomeHeroConfig.secondary_href,
    background_image_url: getString(config.background_image_url),
  }
}

export async function getTtvCategoryPageConfig(
  categoryId?: string
): Promise<TtvCategoryPageConfig> {
  const key = categoryId ? `category_page:${categoryId}` : "category_page"
  const settings = await sdk.client
    .fetch<{ site_settings: TtvSiteSetting[] }>(
      "/store/tranh-tran-vien/catalog/site-settings",
      {
        query: { q: key, limit: 50 },
        cache: "no-store",
      }
    )
    .then(({ site_settings }) => site_settings)
    .catch(() => [])
  const byKey = new Map(settings.map((setting) => [setting.key, setting]))
  const value =
    byKey.get(key)?.value_json ??
    byKey.get("category_page")?.value_json

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultCategoryPageConfig
  }

  const config = value as Record<string, unknown>
  const mediaUrl =
    getString(config.media_url) ?? getString(config.banner_image_url)

  return {
    eyebrow: getString(config.eyebrow) ?? defaultCategoryPageConfig.eyebrow,
    title: getString(config.title),
    intro:
      getString(config.intro) ??
      getString(config.default_intro) ??
      defaultCategoryPageConfig.intro,
    media_type: getMediaType(config.media_type),
    media_url: mediaUrl,
    media_aspect_ratio:
      getString(config.media_aspect_ratio) ??
      defaultCategoryPageConfig.media_aspect_ratio,
    banner_image_url: getString(config.banner_image_url),
    promo_title:
      getString(config.promo_title) ?? defaultCategoryPageConfig.promo_title,
    promo_body:
      getString(config.promo_body) ?? defaultCategoryPageConfig.promo_body,
    search_placeholder:
      getString(config.search_placeholder) ??
      defaultCategoryPageConfig.search_placeholder,
    topic_label:
      getString(config.topic_label) ?? defaultCategoryPageConfig.topic_label,
  }
}

export async function listTtvPosts(limit = 20) {
  return sdk.client
    .fetch<{ posts: TtvPost[] }>("/store/tranh-tran-vien/business/posts", {
      query: { limit },
      cache: "no-store",
    })
    .then(({ posts }) => posts)
    .catch(() => [])
}

export async function retrieveTtvPost(slug: string) {
  return sdk.client
    .fetch<{ post: TtvPost | null }>(
      `/store/tranh-tran-vien/business/posts/${slug}`,
      {
        cache: "no-store",
      }
    )
    .then(({ post }) => post)
    .catch(() => null)
}

export async function retrieveTtvPage(slug: string) {
  return sdk.client
    .fetch<{ page: TtvPage | null }>(
      `/store/tranh-tran-vien/business/pages/${slug}`,
      {
        cache: "no-store",
      }
    )
    .then(({ page }) => page)
    .catch(() => null)
}

export async function listTtvFeedbacks(productId?: string, limit = 12) {
  return sdk.client
    .fetch<{ feedbacks: TtvFeedback[] }>(
      "/store/tranh-tran-vien/business/feedbacks",
      {
        query: {
          limit,
          ...(productId ? { product_id: productId } : {}),
        },
        cache: "no-store",
      }
    )
    .then(({ feedbacks }) => feedbacks)
    .catch(() => [])
}

export async function listTtvComboRules({
  regionId,
  salesChannelId,
}: {
  regionId?: string
  salesChannelId?: string
} = {}) {
  return sdk.client
    .fetch<{ combo_rules: TtvComboRule[] }>(
      "/store/tranh-tran-vien/rules/combo-rules",
      {
        query: {
          ...(regionId ? { region_id: regionId } : {}),
          ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
        },
        cache: "no-store",
      }
    )
    .then(({ combo_rules }) =>
      Array.isArray(combo_rules) ? combo_rules : []
    )
    .catch(() => [])
}

function getSettingString(
  settings: Map<string, TtvSiteSetting>,
  key: string
): string | null {
  const value = settings.get(key)?.value_json

  if (typeof value === "string") {
    return value
  }

  if (
    value &&
    typeof value === "object" &&
    "value" in value &&
    typeof value.value === "string"
  ) {
    return value.value
  }

  return null
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function getMediaType(value: unknown): "image" | "video" {
  return value === "video" ? "video" : "image"
}

function getHomeHeroSlides(
  value: unknown,
  fallback: TtvHomeHeroSlide
): TtvHomeHeroSlide[] {
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
            getString(slide.media_object_position) ?? "center center",
        }
      })
      .filter((slide): slide is TtvHomeHeroSlide => Boolean(slide))

    if (slides.length) {
      return slides
    }
  }

  return fallback.media_url ? [fallback] : []
}

function getPositiveNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value)

  return Number.isFinite(number) && number > 0 ? number : null
}
