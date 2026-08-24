// Trang admin tùy biến render khu vực tranh tran vien / storefront / categories.

import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react"

type SiteSetting = {
  id: string
  key: string
  value_json: unknown
  is_public: boolean
  group?: string | null
  description?: string | null
}

type ProductCategory = {
  id: string
  name: string
  handle: string
  parent_category_id?: string | null
  rank?: number | null
}

type CategoryPageForm = {
  title: string
  intro: string
  media_type: "image" | "video"
  media_url: string
  media_aspect_ratio: string
  banner_image_url: string
  search_placeholder: string
  topic_label: string
}

const SETTINGS_API = "/admin/tranh-tran-vien/catalog/site-settings"
const CATEGORY_PAGE_PREFIX = "category_page:"

const defaultCategoryPageForm: CategoryPageForm = {
  title: "",
  intro: "",
  media_type: "image",
  media_url: "",
  media_aspect_ratio: "16 / 9",
  banner_image_url: "",
  search_placeholder: "Tim ten tranh, chu de hoac ma san pham",
  topic_label: "Chu de",
}

const TtvCategoryPagesPage = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [settingId, setSettingId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoryPageForm>(defaultCategoryPageForm)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId]
  )

  const loadCategories = async () => {
    setIsLoading(true)

    try {
      const response = await adminFetch<{ product_categories: ProductCategory[] }>(
        "/admin/product-categories?limit=200&fields=id,name,handle,parent_category_id,rank"
      )
      const nextCategories = sortCategories(response.product_categories ?? [])

      setCategories(nextCategories)

      const firstCategoryId = selectedCategoryId || nextCategories[0]?.id || ""
      setSelectedCategoryId(firstCategoryId)

      if (firstCategoryId) {
        await loadCategoryPage(firstCategoryId)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load categories"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategoryPage = async (categoryId: string) => {
    const key = getCategoryPageKey(categoryId)
    const response = await settingsFetch<{ site_settings: SiteSetting[] }>(
      `?q=${encodeURIComponent(key)}&limit=50`
    )
    const setting =
      response.site_settings.find((item) => item.key === key) ?? null

    setSettingId(setting?.id ?? null)
    setForm(setting ? toCategoryPageForm(setting.value_json) : defaultCategoryPageForm)
  }

  const selectCategory = async (categoryId: string) => {
    setSelectedCategoryId(categoryId)

    try {
      await loadCategoryPage(categoryId)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load category page"
      )
    }
  }

  const uploadCategoryMedia = async (event: ChangeEvent<HTMLInputElement>) => {
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
        throw new Error("Upload did not return a media URL")
      }

      setForm((current) => ({
        ...current,
        media_type: file.type.startsWith("video/") ? "video" : "image",
        media_url: uploadedUrl,
        banner_image_url: uploadedUrl,
      }))
      toast.success("Category media uploaded")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload media"
      )
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  const saveCategoryPage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedCategoryId) {
      toast.error("Select a category first")
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        key: getCategoryPageKey(selectedCategoryId),
        value_json: {
          title: form.title.trim(),
          intro: form.intro.trim(),
          media_type: form.media_type,
          media_url: form.media_url.trim(),
          media_aspect_ratio: form.media_aspect_ratio,
          banner_image_url: form.media_url.trim(),
          search_placeholder: form.search_placeholder.trim(),
          topic_label: form.topic_label.trim(),
        },
        is_public: true,
        group: "storefront-category",
        description: selectedCategory
          ? `Storefront category page: ${selectedCategory.name}`
          : "Storefront category page",
      }

      const result = settingId
        ? await settingsFetch<{ site_setting: SiteSetting }>(`/${settingId}`, {
            method: "POST",
            body: JSON.stringify(payload),
          })
        : await settingsFetch<{ site_setting: SiteSetting }>("", {
            method: "POST",
            body: JSON.stringify(payload),
          })

      setSettingId(result.site_setting.id)
      setForm(toCategoryPageForm(result.site_setting.value_json))
      toast.success("Category page saved")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save category page"
      )
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">TTV Category Pages</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Edit the storefront banner and intro for each Medusa category page.
          </Text>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={loadCategories}
          isLoading={isLoading}
        >
          Refresh
        </Button>
      </div>

      <form className="grid gap-6 p-6" onSubmit={saveCategoryPage}>
        <Field label="Category">
          <Select value={selectedCategoryId} onValueChange={selectCategory}>
            <Select.Trigger>
              <Select.Value placeholder="Select category" />
            </Select.Trigger>
            <Select.Content>
              {categories.map((category) => (
                <Select.Item key={category.id} value={category.id}>
                  {formatCategoryLabel(category, categories)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <Field
              label="Upload category media"
              description="Upload an image or video for the right-side frame on this category page."
            >
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={uploadCategoryMedia}
                disabled={isUploading}
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Media type">
                <Select
                  value={form.media_type}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      media_type: value === "video" ? "video" : "image",
                    }))
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

              <Field label="Frame ratio">
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
                    <Select.Item value="3 / 4">3:4 portrait</Select.Item>
                    <Select.Item value="21 / 9">21:9 cinematic</Select.Item>
                  </Select.Content>
                </Select>
              </Field>
            </div>
            <Field label="Media URL">
              <Input
                value={form.media_url}
                onChange={(event) => {
                  const nextUrl = event.target.value

                  setForm((current) => ({
                    ...current,
                    media_url: nextUrl,
                    banner_image_url: nextUrl,
                  }))
                }}
                placeholder="https://..."
              />
            </Field>
          </div>

          <Field label="Title override">
            <Input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder={selectedCategory?.name ?? "Use Medusa category name"}
            />
          </Field>

          <Field label="Intro">
            <Textarea
              value={form.intro}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  intro: event.target.value,
                }))
              }
              placeholder="Use Medusa category description when empty."
            />
          </Field>

          <Field label="Search placeholder">
            <Input
              value={form.search_placeholder}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  search_placeholder: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Topic filter label">
            <Input
              value={form.topic_label}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  topic_label: event.target.value,
                }))
              }
            />
          </Field>
        </div>

        <div className="grid gap-4 border border-ui-border-base p-4 md:grid-cols-[1fr_1.1fr]">
          <div className="grid content-start gap-3">
            <Text size="xsmall" className="text-ui-fg-subtle">
              Preview
            </Text>
            <Heading level="h2">
              {form.title.trim() || selectedCategory?.name || "Category title"}
            </Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {form.intro.trim() ||
                "Use Medusa category description when intro is empty."}
            </Text>
          </div>
          {form.media_url.trim() && (
            <div
              className="overflow-hidden border border-ui-border-base bg-ui-bg-subtle"
              style={{ aspectRatio: form.media_aspect_ratio }}
            >
              {form.media_type === "video" ? (
                <video
                  src={form.media_url}
                  className="h-full w-full object-cover"
                  controls
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={form.media_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSaving}>
            Save category page
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

async function settingsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return jsonFetch(`${SETTINGS_API}${path}`, init)
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return jsonFetch(path, init)
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

function toCategoryPageForm(value: unknown): CategoryPageForm {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultCategoryPageForm
  }

  const config = value as Record<string, unknown>
  const mediaUrl =
    getString(config.media_url) ?? getString(config.banner_image_url) ?? ""

  return {
    title: getString(config.title) ?? "",
    intro: getString(config.intro) ?? "",
    media_type: getMediaType(config.media_type),
    media_url: mediaUrl,
    media_aspect_ratio:
      getAspectRatio(config.media_aspect_ratio) ??
      defaultCategoryPageForm.media_aspect_ratio,
    banner_image_url: mediaUrl,
    search_placeholder:
      getString(config.search_placeholder) ??
      defaultCategoryPageForm.search_placeholder,
    topic_label:
      getString(config.topic_label) ?? defaultCategoryPageForm.topic_label,
  }
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function getMediaType(value: unknown): "image" | "video" {
  return value === "video" ? "video" : "image"
}

function getAspectRatio(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  return ["16 / 9", "4 / 3", "1 / 1", "3 / 4", "21 / 9"].includes(value)
    ? value
    : null
}

function getCategoryPageKey(categoryId: string) {
  return `${CATEGORY_PAGE_PREFIX}${categoryId}`
}

function sortCategories(categories: ProductCategory[]) {
  return [...categories].sort((first, second) => {
    const firstRoot = first.parent_category_id ? 1 : 0
    const secondRoot = second.parent_category_id ? 1 : 0

    if (firstRoot !== secondRoot) {
      return firstRoot - secondRoot
    }

    const firstRank = first.rank ?? Number.MAX_SAFE_INTEGER
    const secondRank = second.rank ?? Number.MAX_SAFE_INTEGER

    if (firstRank !== secondRank) {
      return firstRank - secondRank
    }

    return first.name.localeCompare(second.name)
  })
}

function formatCategoryLabel(
  category: ProductCategory,
  categories: ProductCategory[]
) {
  if (!category.parent_category_id) {
    return category.name
  }

  const parent = categories.find(
    (item) => item.id === category.parent_category_id
  )

  return parent ? `${parent.name} / ${category.name}` : category.name
}

export const config = defineRouteConfig({
  label: "TTV Category Pages",
  rank: 31,
})

export default TtvCategoryPagesPage
