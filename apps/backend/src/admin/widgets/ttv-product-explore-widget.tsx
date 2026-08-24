import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast, usePrompt } from "@medusajs/ui"
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type ProductWidgetProps = {
  data?: {
    id?: string
  }
}

type ImageProduct = {
  image_id: string
  virtual_product_id: string
  title: string
  handle: string
  code: string
  url: string
  original_filename: string
  alt: string
  active: boolean
  sort_order: number
  role: "primary" | "gallery"
  primary_image_id: string
  gallery_count: number
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

type UploadProgress = {
  target: string
  completed: number
  total: number
  filename: string
}

const IMAGE_PRODUCTS_API = "/admin/tranh-tran-vien/catalog/image-products"
const IMAGE_UPLOAD_API = "/admin/tranh-tran-vien/catalog/product-images"
const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"

const TtvProductExploreWidget = ({ data }: ProductWidgetProps) => {
  const productId = data?.id
  const prompt = usePrompt()
  const primaryInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<ImageProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadTarget, setUploadTarget] = useState("")
  const [savingImageId, setSavingImageId] = useState("")
  const [selectedPrimaryIds, setSelectedPrimaryIds] = useState<Set<string>>(
    new Set()
  )
  const [draggingGalleryId, setDraggingGalleryId] = useState("")
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  )

  const primaryImages = useMemo(
    () => images.filter((image) => image.role === "primary"),
    [images]
  )

  const loadData = async () => {
    if (!productId) {
      return
    }

    setIsLoading(true)

    try {
      await loadImages(productId, setImages)
      setSelectedPrimaryIds(new Set())
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tải danh sách ảnh"
      )
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

  const uploadFiles = async ({
    files,
    role,
    primary,
  }: {
    files: File[]
    role: "primary" | "gallery"
    primary?: ImageProduct
  }) => {
    if (!files.length || (role === "gallery" && !primary)) {
      return
    }

    const target = role === "primary" ? "primary" : primary!.image_id
    setUploadTarget(target)

    try {
      let uploadedCount = 0
      const failed: Array<{ filename: string; message: string }> = []

      for (const [index, file] of files.entries()) {
        setUploadProgress({
          target,
          completed: index,
          total: files.length,
          filename: file.name,
        })

        try {
          const response = await adminFetch<ProductImageUploadResponse>(
            IMAGE_UPLOAD_API,
            {
              method: "POST",
              body: JSON.stringify({
                product_id: productId,
                role,
                ...(primary
                  ? {
                      primary_image_id: primary.image_id,
                      parent_product_id: primary.virtual_product_id,
                    }
                  : {}),
                files: [
                  {
                    filename: file.name,
                    mime_type: file.type,
                    content: await fileToBase64(file),
                  },
                ],
              }),
            }
          )

          uploadedCount += response.uploaded_count
          failed.push(...(response.failed ?? []))
        } catch (error) {
          failed.push({
            filename: file.name,
            message:
              error instanceof Error ? error.message : "Không thể tải ảnh lên",
          })
        }
      }

      if (uploadedCount) {
        toast.success(
          role === "gallery"
            ? `Đã thêm ${uploadedCount} ảnh gallery`
            : `Đã tạo ${uploadedCount} sản phẩm bằng ảnh chính`
        )
      }

      if (failed.length) {
        toast.error(
          failed
            .map((failure) => `${failure.filename}: ${failure.message}`)
            .join("\n")
        )
      }

      await loadImages(productId, setImages)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tải ảnh lên"
      )
    } finally {
      setUploadTarget("")
      setUploadProgress(null)
    }
  }

  const handleFileInput = (
    event: ChangeEvent<HTMLInputElement>,
    role: "primary" | "gallery",
    primary?: ImageProduct
  ) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    void uploadFiles({ files, role, primary })
  }

  const handleGalleryDrop = (
    event: DragEvent<HTMLDivElement>,
    primary: ImageProduct
  ) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files ?? [])

    if (files.length) {
      void uploadFiles({ files, role: "gallery", primary })
    }
  }

  const updateLocalImage = (imageId: string, patch: Partial<ImageProduct>) => {
    setImages((current) =>
      current.map((image) =>
        image.image_id === imageId ? { ...image, ...patch } : image
      )
    )
  }

  const savePrimary = async (primary: ImageProduct) => {
    setSavingImageId(primary.image_id)

    try {
      const response = await patchImages({
        action: "update_image",
        product_id: productId,
        image_id: primary.image_id,
        patch: {
          title: primary.title,
          handle: primary.handle,
          code: primary.code,
          active: primary.active,
          alt: primary.alt,
          original_filename: primary.original_filename,
        },
      })

      setImages(response.images)
      toast.success("Đã lưu sản phẩm")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu sản phẩm"
      )
    } finally {
      setSavingImageId("")
    }
  }

  const reorderImages = async (nextImages: ImageProduct[]) => {
    const previousImages = images
    setImages(nextImages)

    try {
      const response = await patchImages({
        action: "reorder_images",
        product_id: productId,
        image_ids: nextImages.map((image) => image.image_id),
      })
      setImages(response.images)
    } catch (error) {
      setImages(previousImages)
      toast.error(
        error instanceof Error ? error.message : "Không thể sắp xếp ảnh"
      )
    }
  }

  const moveGallery = (
    primaryId: string,
    sourceId: string,
    targetId: string
  ) => {
    if (!sourceId || sourceId === targetId) {
      return
    }

    const galleries = getGalleryImages(images, primaryId)

    if (
      !galleries.some((image) => image.image_id === sourceId) ||
      !galleries.some((image) => image.image_id === targetId)
    ) {
      return
    }

    const sourceIndex = images.findIndex((image) => image.image_id === sourceId)
    const targetIndex = images.findIndex((image) => image.image_id === targetId)
    const nextImages = [...images]
    const [source] = nextImages.splice(sourceIndex, 1)
    const insertionIndex = nextImages.findIndex(
      (image) => image.image_id === targetId
    )

    nextImages.splice(
      sourceIndex < targetIndex ? insertionIndex + 1 : insertionIndex,
      0,
      source
    )
    void reorderImages(nextImages)
  }

  const moveGalleryByOffset = (
    primaryId: string,
    imageId: string,
    offset: -1 | 1
  ) => {
    const galleries = getGalleryImages(images, primaryId)
    const index = galleries.findIndex((image) => image.image_id === imageId)
    const target = galleries[index + offset]

    if (target) {
      moveGallery(primaryId, imageId, target.image_id)
    }
  }

  const deleteGallery = async (gallery: ImageProduct) => {
    const confirmed = await prompt({
      title: "Xóa ảnh gallery?",
      description: "Ảnh sẽ bị xóa khỏi sản phẩm. Dữ liệu đơn hàng cũ không đổi.",
      confirmText: "Xóa ảnh",
      cancelText: "Hủy",
      variant: "danger",
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await patchImages({
        action: "delete_image",
        product_id: productId,
        image_id: gallery.image_id,
      })
      setImages(response.images)
      toast.success("Đã xóa ảnh gallery")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa ảnh")
    }
  }

  const deletePrimaryCard = async (primary: ImageProduct) => {
    const galleryIds = getGalleryImages(images, primary.image_id).map(
      (gallery) => gallery.image_id
    )
    const confirmed = await prompt({
      title: "Xóa sản phẩm ảnh?",
      description: `Ảnh chính và ${galleryIds.length} ảnh gallery sẽ bị xóa. Dữ liệu đơn hàng cũ không đổi.`,
      confirmText: "Xóa sản phẩm",
      cancelText: "Hủy",
      variant: "danger",
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await patchImages({
        action: "delete_images",
        product_id: productId,
        image_ids: [primary.image_id, ...galleryIds],
      })
      setImages(response.images)
      setSelectedPrimaryIds((current) => {
        const next = new Set(current)
        next.delete(primary.image_id)
        return next
      })
      toast.success("Đã xóa sản phẩm ảnh")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa sản phẩm"
      )
    }
  }

  const deleteSelectedCards = async () => {
    if (!selectedPrimaryIds.size) {
      return
    }

    const imageIds = images
      .filter(
        (image) =>
          selectedPrimaryIds.has(image.image_id) ||
          (image.role === "gallery" &&
            selectedPrimaryIds.has(image.primary_image_id))
      )
      .map((image) => image.image_id)
    const confirmed = await prompt({
      title: `Xóa ${selectedPrimaryIds.size} sản phẩm đã chọn?`,
      description: "Ảnh chính và toàn bộ gallery đi kèm sẽ bị xóa.",
      confirmText: "Xóa đã chọn",
      cancelText: "Hủy",
      variant: "danger",
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await patchImages({
        action: "delete_images",
        product_id: productId,
        image_ids: imageIds,
      })
      setImages(response.images)
      setSelectedPrimaryIds(new Set())
      toast.success("Đã xóa các sản phẩm được chọn")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa sản phẩm"
      )
    }
  }

  const promoteGallery = async (gallery: ImageProduct) => {
    const confirmed = await prompt({
      title: "Đặt làm ảnh chính?",
      description:
        "Ảnh chính hiện tại sẽ trở thành gallery. Toàn bộ gallery vẫn thuộc cùng sản phẩm.",
      confirmText: "Đặt làm ảnh chính",
      cancelText: "Hủy",
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await patchImages({
        action: "promote_gallery",
        product_id: productId,
        image_id: gallery.image_id,
      })
      setImages(response.images)
      setSelectedPrimaryIds((current) => {
        if (!current.has(gallery.primary_image_id)) {
          return current
        }

        const next = new Set(current)
        next.delete(gallery.primary_image_id)
        next.add(gallery.image_id)
        return next
      })
      toast.success("Đã thay ảnh chính")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể thay ảnh chính"
      )
    }
  }

  const allSelected =
    primaryImages.length > 0 &&
    selectedPrimaryIds.size === primaryImages.length

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <Heading level="h2">Sản phẩm ảnh</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Mỗi card là một sản phẩm hiển thị trên storefront. Gallery được giữ
            riêng bên trong card.
          </Text>
        </div>
        <Button
          type="button"
          size="small"
          variant="secondary"
          onClick={loadData}
          isLoading={isLoading}
        >
          Làm mới
        </Button>
      </div>

      <div className="grid gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Text size="small" weight="plus">
              {primaryImages.length} sản phẩm · {images.length} file ảnh
            </Text>
            <Text className="text-ui-fg-subtle" size="xsmall">
              Giá, category và collection vẫn lấy từ Product Medusa này.
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {primaryImages.length ? (
              <label className="flex items-center gap-2 text-small-regular text-ui-fg-subtle">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) =>
                    setSelectedPrimaryIds(
                      event.target.checked
                        ? new Set(primaryImages.map((image) => image.image_id))
                        : new Set()
                    )
                  }
                />
                Chọn tất cả
              </label>
            ) : null}
            {selectedPrimaryIds.size ? (
              <Button
                type="button"
                size="small"
                variant="danger"
                onClick={deleteSelectedCards}
              >
                Xóa đã chọn ({selectedPrimaryIds.size})
              </Button>
            ) : null}
            <Button
              type="button"
              size="small"
              variant="secondary"
              disabled={Boolean(uploadTarget)}
              onClick={() => primaryInputRef.current?.click()}
            >
              {uploadProgress?.target === "primary"
                ? `Đang tải ${uploadProgress.completed + 1}/${uploadProgress.total}`
                : "+ Thêm sản phẩm bằng ảnh chính"}
            </Button>
            <input
              ref={primaryInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              style={{ display: "none" }}
              disabled={Boolean(uploadTarget)}
              onChange={(event) => handleFileInput(event, "primary")}
            />
          </div>
        </div>

        {primaryImages.length ? (
          <div className="grid items-start grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {primaryImages.map((primary) => (
              <ProductImageCard
                key={primary.image_id}
                primary={primary}
                galleries={getGalleryImages(images, primary.image_id)}
                selected={selectedPrimaryIds.has(primary.image_id)}
                uploading={uploadTarget === primary.image_id}
                uploadDisabled={Boolean(uploadTarget)}
                uploadProgress={
                  uploadProgress?.target === primary.image_id
                    ? uploadProgress
                    : null
                }
                saving={savingImageId === primary.image_id}
                draggingGalleryId={draggingGalleryId}
                onSelectedChange={(selected) =>
                  setSelectedPrimaryIds((current) => {
                    const next = new Set(current)
                    selected
                      ? next.add(primary.image_id)
                      : next.delete(primary.image_id)
                    return next
                  })
                }
                onPrimaryChange={(patch) =>
                  updateLocalImage(primary.image_id, patch)
                }
                onSave={() => savePrimary(primary)}
                onDelete={() => deletePrimaryCard(primary)}
                onGalleryInput={(event) =>
                  handleFileInput(event, "gallery", primary)
                }
                onGalleryDrop={(event) => handleGalleryDrop(event, primary)}
                onDeleteGallery={deleteGallery}
                onPromoteGallery={promoteGallery}
                onMoveGallery={(imageId, offset) =>
                  moveGalleryByOffset(primary.image_id, imageId, offset)
                }
                onGalleryDragStart={(imageId) =>
                  setDraggingGalleryId(imageId)
                }
                onGalleryDropForSort={(targetId) => {
                  moveGallery(primary.image_id, draggingGalleryId, targetId)
                  setDraggingGalleryId("")
                }}
                onGalleryDragEnd={() => setDraggingGalleryId("")}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-rounded border border-dashed border-ui-border-base p-6">
            <Text className="text-ui-fg-muted" size="small">
              Chưa có sản phẩm ảnh. Chọn “Thêm sản phẩm bằng ảnh chính” để tạo
              một hoặc nhiều card mới.
            </Text>
          </div>
        )}
      </div>
    </Container>
  )
}

function ProductImageCard({
  primary,
  galleries,
  selected,
  uploading,
  uploadDisabled,
  uploadProgress,
  saving,
  draggingGalleryId,
  onSelectedChange,
  onPrimaryChange,
  onSave,
  onDelete,
  onGalleryInput,
  onGalleryDrop,
  onDeleteGallery,
  onPromoteGallery,
  onMoveGallery,
  onGalleryDragStart,
  onGalleryDropForSort,
  onGalleryDragEnd,
}: {
  primary: ImageProduct
  galleries: ImageProduct[]
  selected: boolean
  uploading: boolean
  uploadDisabled: boolean
  uploadProgress: UploadProgress | null
  saving: boolean
  draggingGalleryId: string
  onSelectedChange: (selected: boolean) => void
  onPrimaryChange: (patch: Partial<ImageProduct>) => void
  onSave: () => void
  onDelete: () => void
  onGalleryInput: (event: ChangeEvent<HTMLInputElement>) => void
  onGalleryDrop: (event: DragEvent<HTMLDivElement>) => void
  onDeleteGallery: (gallery: ImageProduct) => void
  onPromoteGallery: (gallery: ImageProduct) => void
  onMoveGallery: (imageId: string, offset: -1 | 1) => void
  onGalleryDragStart: (imageId: string) => void
  onGalleryDropForSort: (targetId: string) => void
  onGalleryDragEnd: () => void
}) {
  const galleryInputRef = useRef<HTMLInputElement>(null)

  return (
    <article className="min-w-0 overflow-hidden rounded-rounded border border-ui-border-base bg-ui-bg-base">
      <div className="grid gap-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <label className="flex min-w-0 items-center gap-2 text-small-regular text-ui-fg-subtle">
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelectedChange(event.target.checked)}
            />
            Chọn sản phẩm
          </label>
          <span className="flex shrink-0 items-center gap-1.5 text-xsmall-regular text-ui-fg-subtle">
            <span
              className={`h-2 w-2 rounded-full ${
                primary.active ? "bg-ui-tag-green-icon" : "bg-ui-tag-neutral-icon"
              }`}
            />
            {primary.active ? "Đang hiển thị" : "Đang ẩn"}
          </span>
        </div>

        <a href={primary.url} target="_blank" rel="noreferrer">
          <img
            src={primary.url}
            alt={primary.alt || primary.title}
            className="aspect-[4/3] w-full rounded-rounded border border-ui-border-base object-cover"
          />
        </a>

        <div className="min-w-0">
          <Text className="truncate text-ui-fg-subtle" size="xsmall">
            {primary.code || "Chưa có mã"}
          </Text>
          <Text className="truncate" size="small" weight="plus">
            {primary.title}
          </Text>
        </div>

        <details className="min-w-0 rounded-rounded border border-ui-border-base">
          <summary className="cursor-pointer px-3 py-2 text-small-regular text-ui-fg-subtle">
            Chỉnh sửa · Thông tin nâng cao
          </summary>
          <div className="grid min-w-0 gap-3 border-t border-ui-border-base p-3">
            <ImageField
              label="Tên sản phẩm"
              value={primary.title}
              onChange={(value) => onPrimaryChange({ title: value })}
            />
            <ImageField
              label="Mã sản phẩm"
              value={primary.code}
              onChange={(value) => onPrimaryChange({ code: value })}
            />
            <ImageField
              label="Handle"
              value={primary.handle}
              onChange={(value) => onPrimaryChange({ handle: value })}
            />
            <ImageField
              label="Alt text"
              value={primary.alt}
              onChange={(value) => onPrimaryChange({ alt: value })}
            />
            <ImageField
              label="Tên file gốc"
              value={primary.original_filename}
              onChange={(value) =>
                onPrimaryChange({ original_filename: value })
              }
            />
            <label className="flex items-center gap-2 text-small-regular text-ui-fg-subtle">
              <input
                type="checkbox"
                checked={primary.active}
                onChange={(event) =>
                  onPrimaryChange({ active: event.target.checked })
                }
              />
              Hiển thị trên cửa hàng
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="small"
                onClick={onSave}
                isLoading={saving}
              >
                Lưu
              </Button>
              <Button
                type="button"
                size="small"
                variant="danger"
                onClick={onDelete}
              >
                Xóa sản phẩm
              </Button>
            </div>
          </div>
        </details>
      </div>

      <div className="grid min-w-0 gap-3 border-t border-ui-border-base bg-ui-bg-subtle p-3">
        <div className="flex items-center justify-between gap-3">
          <Text size="small" weight="plus">
            Gallery — {galleries.length} ảnh
          </Text>
          {uploading ? (
            <Text className="text-ui-fg-muted" size="xsmall">
              Đang tải {uploadProgress ? uploadProgress.completed + 1 : 1}/
              {uploadProgress?.total ?? 1}
            </Text>
          ) : null}
        </div>

        {galleries.length ? (
          <div className="grid min-w-0 grid-cols-3 gap-2">
            {galleries.map((gallery, index) => (
              <GalleryThumbnail
                key={gallery.image_id}
                gallery={gallery}
                index={index}
                count={galleries.length}
                dragging={draggingGalleryId === gallery.image_id}
                onDelete={() => onDeleteGallery(gallery)}
                onPromote={() => onPromoteGallery(gallery)}
                onMove={(offset) => onMoveGallery(gallery.image_id, offset)}
                onDragStart={() => onGalleryDragStart(gallery.image_id)}
                onDrop={() => onGalleryDropForSort(gallery.image_id)}
                onDragEnd={onGalleryDragEnd}
              />
            ))}
          </div>
        ) : null}

        <div
          className="grid min-h-24 place-items-center gap-2 rounded-rounded border border-dashed border-ui-border-strong p-4 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onGalleryDrop}
        >
          <span className="grid gap-1">
            <Text size="small" weight="plus">
              Thêm ảnh gallery
            </Text>
            <Text className="text-ui-fg-muted" size="xsmall">
              {uploading && uploadProgress
                ? `${uploadProgress.filename} · ${uploadProgress.completed + 1}/${uploadProgress.total}`
                : "Kéo thả nhiều ảnh vào đây hoặc nhấn nút để chọn"}
            </Text>
          </span>
          <Button
            type="button"
            size="small"
            variant="secondary"
            disabled={uploadDisabled}
            onClick={() => galleryInputRef.current?.click()}
          >
            {uploading ? "Đang tải..." : "Chọn ảnh gallery"}
          </Button>
          <input
            ref={galleryInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            style={{ display: "none" }}
            disabled={uploadDisabled}
            onChange={onGalleryInput}
          />
        </div>
      </div>
    </article>
  )
}

function GalleryThumbnail({
  gallery,
  index,
  count,
  dragging,
  onDelete,
  onPromote,
  onMove,
  onDragStart,
  onDrop,
  onDragEnd,
}: {
  gallery: ImageProduct
  index: number
  count: number
  dragging: boolean
  onDelete: () => void
  onPromote: () => void
  onMove: (offset: -1 | 1) => void
  onDragStart: () => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      className={`grid min-w-0 gap-1 rounded-rounded border bg-ui-bg-base p-1 ${
        dragging ? "border-ui-border-interactive opacity-60" : "border-ui-border-base"
      }`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", gallery.image_id)
        onDragStart()
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        if (event.dataTransfer.files.length) {
          return
        }

        event.preventDefault()
        onDrop()
      }}
      onDragEnd={onDragEnd}
    >
      <a href={gallery.url} target="_blank" rel="noreferrer">
        <img
          src={gallery.url}
          alt={gallery.alt || gallery.title}
          className="aspect-square w-full rounded object-cover"
        />
      </a>
      <details className="min-w-0">
        <summary className="cursor-pointer truncate px-1 text-center text-xsmall-regular text-ui-fg-subtle">
          Ảnh {index + 1} · ⋯
        </summary>
        <div className="grid gap-1 pt-1">
          <button
            type="button"
            className="w-full min-w-0 truncate rounded px-1 py-1 text-xsmall-regular text-ui-fg-subtle hover:bg-ui-bg-subtle"
            onClick={onPromote}
          >
            Đặt làm ảnh chính
          </button>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              className="rounded px-1 py-1 text-xsmall-regular text-ui-fg-subtle hover:bg-ui-bg-subtle disabled:opacity-40"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              aria-label="Chuyển ảnh sang trái"
            >
              ←
            </button>
            <button
              type="button"
              className="rounded px-1 py-1 text-xsmall-regular text-ui-fg-subtle hover:bg-ui-bg-subtle disabled:opacity-40"
              disabled={index === count - 1}
              onClick={() => onMove(1)}
              aria-label="Chuyển ảnh sang phải"
            >
              →
            </button>
          </div>
          <button
            type="button"
            className="w-full rounded px-1 py-1 text-xsmall-regular text-ui-fg-error hover:bg-ui-bg-subtle"
            onClick={onDelete}
          >
            Xóa ảnh
          </button>
        </div>
      </details>
    </div>
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
    <label className="grid min-w-0 gap-1 text-small-regular text-ui-fg-subtle">
      <span>{label}</span>
      <input
        className="h-9 w-full min-w-0 rounded-rounded border border-ui-border-base bg-ui-bg-base px-2 text-ui-fg-base"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function getGalleryImages(images: ImageProduct[], primaryImageId: string) {
  return images.filter(
    (image) =>
      image.role === "gallery" && image.primary_image_id === primaryImageId
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
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error(`Không thể đọc file ${file.name}`))
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Không thể đọc file ${file.name}`))
        return
      }

      const separatorIndex = reader.result.indexOf(",")

      if (separatorIndex < 0) {
        reject(new Error(`File ${file.name} không hợp lệ`))
        return
      }

      resolve(reader.result.slice(separatorIndex + 1))
    }
    reader.readAsDataURL(file)
  })
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
    credentials: "include",
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      typeof payload.message === "string"
        ? payload.message
        : "Admin request failed"
    )
  }

  return payload as T
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default TtvProductExploreWidget
