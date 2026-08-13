import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { ChangeEvent, useEffect, useMemo, useState } from "react"

type ProductWidgetProps = {
  data?: {
    id?: string
  }
}

type ExploreImage = {
  image_id: string
  code: string
  url: string
  original_filename: string
  alt: string
  sort_order: number
  visibility: "visible" | "hidden"
}

type ExploreTerm = {
  id: string
  name: string
  status: "draft" | "active" | "archived"
  metadata?: {
    gallery_images?: ExploreImage[]
    [key: string]: unknown
  } | null
}

type ExploreGroup = {
  code: string
  label: string
  terms: ExploreTerm[]
}

type ExploreResponse = {
  groups: ExploreGroup[]
  selected_term_ids?: string[]
}

type GalleryResponse = {
  gallery_images: ExploreImage[]
}

const EXPLORE_API = "/admin/tranh-tran-vien/catalog/explore"

const TtvProductExploreWidget = ({ data }: ProductWidgetProps) => {
  const productId = data?.id
  const [groups, setGroups] = useState<ExploreGroup[]>([])
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([])
  const [activeGroupCode, setActiveGroupCode] = useState("")
  const [activeTermId, setActiveTermId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const activeGroup = useMemo(
    () => groups.find((group) => group.code === activeGroupCode) ?? groups[0],
    [activeGroupCode, groups]
  )
  const activeTerm = useMemo(
    () => activeGroup?.terms.find((term) => term.id === activeTermId),
    [activeGroup, activeTermId]
  )
  const galleryImages = useMemo(
    () => getGalleryImages(activeTerm),
    [activeTerm]
  )

  const loadExplore = async () => {
    if (!productId) {
      return
    }

    setIsLoading(true)

    try {
      const response = await adminFetch<ExploreResponse>(
        `${EXPLORE_API}?product_id=${encodeURIComponent(productId)}`
      )

      setGroups(response.groups)
      setSelectedTermIds(response.selected_term_ids ?? [])
      setActiveGroupCode((current) => {
        const nextGroup = getValidGroup(response.groups, current)
        return nextGroup?.code ?? ""
      })
      setActiveTermId((current) => {
        const nextGroup = getValidGroup(response.groups, activeGroupCode)
        const isValidCurrent = nextGroup?.terms.some(
          (term) => term.id === current
        )

        return isValidCurrent ? current : nextGroup?.terms[0]?.id ?? ""
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load Explore")
    } finally {
      setIsLoading(false)
    }
  }

  const saveProductAssignment = async () => {
    if (!productId) {
      return
    }

    setIsSaving(true)

    try {
      const response = await adminFetch<{ selected_term_ids?: string[] }>(
        EXPLORE_API,
        {
          method: "POST",
          body: JSON.stringify({
            product_id: productId,
            term_ids: selectedTermIds,
          }),
        }
      )

      setSelectedTermIds(response.selected_term_ids ?? [])
      toast.success("Explore assignments saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save Explore")
    } finally {
      setIsSaving(false)
    }
  }

  const uploadGalleryImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""

    if (!activeTerm || !files.length) {
      return
    }

    setIsUploading(true)

    try {
      const data = new FormData()
      files.forEach((file) => data.append("files", file))

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
      const uploadedFiles = result.files ?? []

      if (!uploadedFiles.length) {
        throw new Error("Upload did not return image URLs")
      }

      const gallery = await adminFetch<GalleryResponse>(EXPLORE_API, {
        method: "PATCH",
        body: JSON.stringify({
          action: "add_images",
          term_id: activeTerm.id,
          images: uploadedFiles.map((file, index) => ({
            image_id: file.id,
            url: file.url,
            original_filename: files[index]?.name ?? "",
          })),
        }),
      })

      updateActiveTermGallery(gallery.gallery_images)
      toast.success(`Uploaded ${uploadedFiles.length} image(s)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload images")
    } finally {
      setIsUploading(false)
    }
  }

  const patchGalleryImage = async (
    imageId: string,
    patch: Partial<ExploreImage>
  ) => {
    if (!activeTerm) {
      return
    }

    try {
      const response = await adminFetch<GalleryResponse>(EXPLORE_API, {
        method: "PATCH",
        body: JSON.stringify({
          action: "update_image",
          term_id: activeTerm.id,
          image_id: imageId,
          patch,
        }),
      })

      updateActiveTermGallery(response.gallery_images)
      toast.success("Image saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save image")
    }
  }

  const deleteGalleryImage = async (imageId: string) => {
    if (!activeTerm) {
      return
    }

    try {
      const response = await adminFetch<GalleryResponse>(EXPLORE_API, {
        method: "PATCH",
        body: JSON.stringify({
          action: "delete_image",
          term_id: activeTerm.id,
          image_id: imageId,
        }),
      })

      updateActiveTermGallery(response.gallery_images)
      toast.success("Image deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete image")
    }
  }

  const moveGalleryImage = async (imageId: string, direction: -1 | 1) => {
    if (!activeTerm) {
      return
    }

    const currentIndex = galleryImages.findIndex(
      (image) => image.image_id === imageId
    )
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= galleryImages.length) {
      return
    }

    const nextImages = [...galleryImages]
    const [image] = nextImages.splice(currentIndex, 1)
    nextImages.splice(nextIndex, 0, image)

    try {
      const response = await adminFetch<GalleryResponse>(EXPLORE_API, {
        method: "PATCH",
        body: JSON.stringify({
          action: "reorder_images",
          term_id: activeTerm.id,
          image_ids: nextImages.map((candidate) => candidate.image_id),
        }),
      })

      updateActiveTermGallery(response.gallery_images)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reorder image")
    }
  }

  const updateLocalImage = (
    imageId: string,
    patch: Partial<ExploreImage>
  ) => {
    updateActiveTermGallery(
      galleryImages.map((image) =>
        image.image_id === imageId ? { ...image, ...patch } : image
      )
    )
  }

  const updateActiveTermGallery = (images: ExploreImage[]) => {
    if (!activeTerm) {
      return
    }

    setGroups((current) =>
      current.map((group) => ({
        ...group,
        terms: group.terms.map((term) =>
          term.id === activeTerm.id
            ? {
                ...term,
                metadata: {
                  ...(term.metadata ?? {}),
                  gallery_images: images,
                },
              }
            : term
        ),
      }))
    )
  }

  useEffect(() => {
    loadExplore()
  }, [productId])

  if (!productId) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Explore</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Assign this product and manage the selected Explore Item gallery.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/app/tranh-tran-vien/storefront/explore-items"
            className="rounded-rounded border border-ui-border-base px-3 py-2 text-small-regular text-ui-fg-subtle transition-colors hover:border-ui-border-strong hover:text-ui-fg-base"
          >
            Manage items
          </a>
          <Button
            type="button"
            size="small"
            variant="secondary"
            onClick={loadExplore}
            isLoading={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {groups.map((group) => (
            <div key={group.code} className="grid content-start gap-2">
              <Text size="small" weight="plus">
                {group.label}
              </Text>
              {group.terms.length ? (
                group.terms.map((term) => (
                  <label
                    key={term.id}
                    className="flex items-center gap-2 text-small-regular text-ui-fg-subtle"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTermIds.includes(term.id)}
                      onChange={(event) =>
                        setSelectedTermIds((current) =>
                          event.target.checked
                            ? unique([...current, term.id])
                            : current.filter((termId) => termId !== term.id)
                        )
                      }
                    />
                    <span>
                      {term.name}
                      {term.status === "active" ? "" : " (hidden)"}
                    </span>
                  </label>
                ))
              ) : (
                <Text className="text-ui-fg-muted" size="xsmall">
                  No items yet
                </Text>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={saveProductAssignment}
            isLoading={isSaving}
          >
            Save Explore
          </Button>
        </div>

        <div className="grid gap-4 rounded-rounded border border-ui-border-base p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-small-regular text-ui-fg-subtle">
              <span>Explore Heading</span>
              <select
                className="h-10 rounded-rounded border border-ui-border-base bg-ui-bg-base px-3 text-ui-fg-base"
                value={activeGroup?.code ?? ""}
                onChange={(event) => {
                  const group = groups.find(
                    (candidate) => candidate.code === event.target.value
                  )
                  setActiveGroupCode(event.target.value)
                  setActiveTermId("")
                  window.setTimeout(
                    () => setActiveTermId(group?.terms[0]?.id ?? ""),
                    0
                  )
                }}
              >
                {groups.map((group) => (
                  <option key={group.code} value={group.code}>
                    {group.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-small-regular text-ui-fg-subtle">
              <span>Explore Item</span>
              <select
                className="h-10 rounded-rounded border border-ui-border-base bg-ui-bg-base px-3 text-ui-fg-base"
                value={activeTerm?.id ?? ""}
                onChange={(event) => setActiveTermId(event.target.value)}
                disabled={!activeGroup?.terms.length}
              >
                {(activeGroup?.terms ?? []).map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <Text size="small" weight="plus">
                Images
              </Text>
              <Text className="text-ui-fg-subtle" size="xsmall">
                {activeTerm
                  ? `${activeGroup?.label ?? ""} / ${activeTerm.name}`
                  : "Choose an Explore Item"}
              </Text>
            </div>
            <label className="cursor-pointer rounded-rounded border border-ui-border-base px-3 py-2 text-small-regular text-ui-fg-subtle transition-colors hover:border-ui-border-strong hover:text-ui-fg-base">
              {isUploading ? "Uploading..." : "+ Add Images"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={!activeTerm || isUploading}
                onChange={uploadGalleryImages}
              />
            </label>
          </div>

          {!activeTerm ? (
            <Text className="text-ui-fg-muted" size="small">
              Choose an Explore Item to view its images.
            </Text>
          ) : galleryImages.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {galleryImages.map((image, index) => (
                <div
                  key={image.image_id}
                  className="grid gap-3 rounded-rounded border border-ui-border-base p-3"
                >
                  <img
                    src={image.url}
                    alt={image.alt || image.code}
                    className="aspect-[4/3] w-full rounded-rounded border border-ui-border-base object-cover"
                  />
                  <div className="grid gap-2">
                    <label className="grid gap-1 text-small-regular text-ui-fg-subtle">
                      <span>Image code</span>
                      <input
                        className="h-9 rounded-rounded border border-ui-border-base bg-ui-bg-base px-2 text-ui-fg-base"
                        value={image.code}
                        onChange={(event) =>
                          updateLocalImage(image.image_id, {
                            code: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-small-regular text-ui-fg-subtle">
                      <span>Original filename</span>
                      <input
                        className="h-9 rounded-rounded border border-ui-border-base bg-ui-bg-base px-2 text-ui-fg-base"
                        value={image.original_filename}
                        onChange={(event) =>
                          updateLocalImage(image.image_id, {
                            original_filename: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-small-regular text-ui-fg-subtle">
                      <span>Alt / display name</span>
                      <input
                        className="h-9 rounded-rounded border border-ui-border-base bg-ui-bg-base px-2 text-ui-fg-base"
                        value={image.alt}
                        onChange={(event) =>
                          updateLocalImage(image.image_id, {
                            alt: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <Text className="text-ui-fg-muted" size="xsmall">
                    Order: {image.sort_order + 1} / ID: {image.image_id}
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      onClick={() =>
                        patchGalleryImage(image.image_id, {
                          code: image.code,
                          original_filename: image.original_filename,
                          alt: image.alt,
                          visibility: image.visibility,
                        })
                      }
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      disabled={index === 0}
                      onClick={() => moveGalleryImage(image.image_id, -1)}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      disabled={index === galleryImages.length - 1}
                      onClick={() => moveGalleryImage(image.image_id, 1)}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      onClick={() =>
                        patchGalleryImage(image.image_id, {
                          visibility:
                            image.visibility === "visible" ? "hidden" : "visible",
                        })
                      }
                    >
                      {image.visibility === "visible" ? "Hide" : "Show"}
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      variant="danger"
                      onClick={() => deleteGalleryImage(image.image_id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Text className="text-ui-fg-muted" size="small">
              No images for this Explore Item yet.
            </Text>
          )}
        </div>
      </div>
    </Container>
  )
}

function getGalleryImages(term?: ExploreTerm): ExploreImage[] {
  const galleryImages = term?.metadata?.gallery_images

  if (!Array.isArray(galleryImages)) {
    return []
  }

  return [...galleryImages].sort(
    (first, second) => first.sort_order - second.sort_order
  )
}

function getValidGroup(groups: ExploreGroup[], groupCode: string) {
  return groups.find((group) => group.code === groupCode) ?? groups[0]
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

async function adminFetch<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
  id: "ttv-product-explore",
})

export default TtvProductExploreWidget
