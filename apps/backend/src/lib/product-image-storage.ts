export type ProductImageRecord = {
  id: string
  url: string
  product_id?: string
  created_at?: string | Date
}

export type ProductImageLookupService = {
  listProductImages: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProductImageRecord[]>
}

export type ProductImageWriteService = ProductImageLookupService & {
  deleteProductImages: (ids: string[]) => Promise<void>
}

export type FileModuleWriteService = {
  deleteFiles: (ids: string[]) => Promise<void>
}

export function deriveFileKey(
  url: string,
  fileBaseUrl?: string
): string | null {
  const baseUrl = fileBaseUrl?.replace(/\/+$/, "")

  if (!baseUrl || !url.startsWith(`${baseUrl}/`)) {
    return null
  }

  return decodeURIComponent(url.slice(baseUrl.length + 1))
}

export async function deleteUnusedFilesByUrl(
  urls: string[],
  productImageService: ProductImageLookupService,
  fileModuleService: FileModuleWriteService,
  fileBaseUrl: string | undefined
): Promise<string[]> {
  const keysToDelete: string[] = []

  for (const url of Array.from(new Set(urls.filter(Boolean)))) {
    const fileKey = deriveFileKey(url, fileBaseUrl)

    if (!fileKey) {
      continue
    }

    const activeImages = await productImageService.listProductImages({ url })

    if (!activeImages.length) {
      keysToDelete.push(fileKey)
    }
  }

  if (keysToDelete.length) {
    await fileModuleService.deleteFiles(keysToDelete)
  }

  return keysToDelete
}
