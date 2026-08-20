import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast, usePrompt } from "@medusajs/ui"
import { ChangeEvent, useEffect, useState } from "react"

type ProductWidgetProps = {
  data?: {
    id?: string
  }
}

type ImageProduct = {
  image_id: string
  title: string
  handle: string
  code: string
  url: string
  original_filename: string
  alt: string
  active: boolean
  sort_order: number
}

type ImageProductsResponse = {
  product_id: string
  product_title: string
  images: ImageProduct[]
}

type ProductImageUploadResponse = {
  uploaded_count: number
  failed_count: number
  failed?: Array<{ filename: string; message: string }>
}

const IMAGE_PRODUCTS_API = "/admin/tranh-tran-vien/catalog/image-products"
const IMAGE_UPLOAD_API =
  "/admin/tranh-tran-vien/catalog/explore/product-images"

const TtvProductExploreWidget = ({ data }: ProductWidgetProps) => {
  const productId = data?.id
  const prompt = usePrompt()
  const [images, setImages] = useState<ImageProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [savingImageId, setSavingImageId] = useState("")

  const loadData = async () => {
    if (!productId) {
      return
    }

    setIsLoading(true)

    try {
      const imageProducts = await adminFetch<ImageProductsResponse>(
        `${IMAGE_PRODUCTS_API}?product_id=${encodeURIComponent(productId)}`
      )
      setImages(imageProducts.images)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load product data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [productId])

  if (!productId) {
    return null
  }

  const uploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""

    if (!files.length) {
      return
    }

    setIsUploading(true)

    try {
      const payloadFiles = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          mime_type: file.type,
          content: await fileToBase64(file),
        }))
      )
      const response = await adminFetch<ProductImageUploadResponse>(
        IMAGE_UPLOAD_API,
        {
          method: "POST",
          body: JSON.stringify({
            product_id: productId,
            files: payloadFiles,
          }),
        }
      )

      if (response.uploaded_count) {
        toast.success(`${response.uploaded_count} image product(s) uploaded`)
      }

      if (response.failed?.length) {
        toast.error(
          response.failed
            .map((failure) => `${failure.filename}: ${failure.message}`)
            .join("\n")
        )
      }

      await loadImages(productId, setImages)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload images")
    } finally {
      setIsUploading(false)
    }
  }

  const updateLocalImage = (
    imageId: string,
    patch: Partial<ImageProduct>
  ) => {
    setImages((current) =>
      current.map((image) =>
        image.image_id === imageId ? { ...image, ...patch } : image
      )
    )
  }

  const saveImage = async (image: ImageProduct) => {
    setSavingImageId(image.image_id)

    try {
      const response = await patchImages({
        action: "update_image",
        product_id: productId,
        image_id: image.image_id,
        patch: {
          title: image.title,
          handle: image.handle,
          code: image.code,
          active: image.active,
          alt: image.alt,
          original_filename: image.original_filename,
        },
      })

      setImages(response.images)
      toast.success("Image product saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save image product")
    } finally {
      setSavingImageId("")
    }
  }

  const moveImage = async (imageId: string, direction: -1 | 1) => {
    const currentIndex = images.findIndex((image) => image.image_id === imageId)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= images.length) {
      return
    }

    const nextImages = [...images]
    const [image] = nextImages.splice(currentIndex, 1)
    nextImages.splice(nextIndex, 0, image)
    setImages(nextImages)

    try {
      const response = await patchImages({
        action: "reorder_images",
        product_id: productId,
        image_ids: nextImages.map((candidate) => candidate.image_id),
      })
      setImages(response.images)
    } catch (error) {
      setImages(images)
      toast.error(error instanceof Error ? error.message : "Could not reorder images")
    }
  }

  const deleteImage = async (image: ImageProduct) => {
    const confirmed = await prompt({
      title: "Delete image product?",
      description: `Remove “${image.title}” from this product album. Existing order snapshots are not changed.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await patchImages({
        action: "delete_image",
        product_id: productId,
        image_id: image.image_id,
      })
      setImages(response.images)
      toast.success("Image product deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete image product")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h2">Album & image products</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            This Medusa Product is the album. Each active image is one storefront product.
          </Text>
        </div>
        <Button
          type="button"
          size="small"
          variant="secondary"
          onClick={loadData}
          isLoading={isLoading}
        >
          Refresh
        </Button>
      </div>

      <div className="grid gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Text size="small" weight="plus">Image products ({images.length})</Text>
            <Text className="text-ui-fg-subtle" size="xsmall">
              Category and collection come from this parent Product. Price and
              production options come from its internal variant.
            </Text>
          </div>
          <label className="cursor-pointer rounded-rounded border border-ui-border-base px-3 py-2 text-small-regular text-ui-fg-subtle transition-colors hover:border-ui-border-strong hover:text-ui-fg-base">
            {isUploading ? "Uploading..." : "+ Add images"}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={isUploading}
              onChange={uploadImages}
            />
          </label>
        </div>

        {images.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {images.map((image, index) => (
              <div
                key={image.image_id}
                className="grid gap-3 rounded-rounded border border-ui-border-base p-3"
              >
                <img
                  src={image.url}
                  alt={image.alt || image.title}
                  className="aspect-[4/3] w-full rounded-rounded border border-ui-border-base object-cover"
                />
                <ImageField
                  label="Storefront name"
                  value={image.title}
                  onChange={(value) => updateLocalImage(image.image_id, { title: value })}
                />
                <ImageField
                  label="Handle"
                  value={image.handle}
                  onChange={(value) => updateLocalImage(image.image_id, { handle: value })}
                />
                <ImageField
                  label="Code"
                  value={image.code}
                  onChange={(value) => updateLocalImage(image.image_id, { code: value })}
                />
                <ImageField
                  label="Alt text"
                  value={image.alt}
                  onChange={(value) => updateLocalImage(image.image_id, { alt: value })}
                />
                <ImageField
                  label="Original filename"
                  value={image.original_filename}
                  onChange={(value) =>
                    updateLocalImage(image.image_id, { original_filename: value })
                  }
                />
                <label className="flex items-center gap-2 text-small-regular text-ui-fg-subtle">
                  <input
                    type="checkbox"
                    checked={image.active}
                    onChange={(event) =>
                      updateLocalImage(image.image_id, { active: event.target.checked })
                    }
                  />
                  Visible on storefront
                </label>
                <Text className="text-ui-fg-muted" size="xsmall">
                  Order {index + 1} · ID {image.image_id}
                </Text>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="small"
                    onClick={() => saveImage(image)}
                    isLoading={savingImageId === image.image_id}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    disabled={index === 0}
                    onClick={() => moveImage(image.image_id, -1)}
                  >
                    Up
                  </Button>
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    disabled={index === images.length - 1}
                    onClick={() => moveImage(image.image_id, 1)}
                  >
                    Down
                  </Button>
                  <Button
                    type="button"
                    size="small"
                    variant="danger"
                    onClick={() => deleteImage(image)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-rounded border border-dashed border-ui-border-base p-6">
            <Text className="text-ui-fg-muted" size="small">
              No images yet. Upload at least one image before publishing this album.
            </Text>
          </div>
        )}
      </div>
    </Container>
  )
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-small-regular text-ui-fg-subtle">
      <span>{label}</span>
      <input
        className="h-9 rounded-rounded border border-ui-border-base bg-ui-bg-base px-2 text-ui-fg-base"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

async function loadImages(
  productId: string,
  setImages: (images: ImageProduct[]) => void
) {
  const response = await adminFetch<ImageProductsResponse>(
    `${IMAGE_PRODUCTS_API}?product_id=${encodeURIComponent(productId)}`
  )
  setImages(response.images)
}

async function patchImages(body: Record<string, unknown>) {
  return adminFetch<ImageProductsResponse>(IMAGE_PRODUCTS_API, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  let binary = ""
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return window.btoa(binary)
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
    let message = text

    try {
      const payload = JSON.parse(text) as { message?: unknown }

      if (typeof payload.message === "string") {
        message = payload.message
      }
    } catch {
      message = text
    }

    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
  id: "ttv-product-explore",
})

export default TtvProductExploreWidget
