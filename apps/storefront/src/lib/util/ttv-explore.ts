import type {
  TtvExploreGalleryImage,
  TtvExploreTerm,
} from "@lib/data/ttv-explore"

export function getExploreGalleryImages(
  term: TtvExploreTerm
): TtvExploreGalleryImage[] {
  const galleryImages = term.metadata?.gallery_images

  if (!Array.isArray(galleryImages)) {
    return []
  }

  return galleryImages
    .map((entry): TtvExploreGalleryImage | null => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null
      }

      const image = entry as Record<string, unknown>
      const url = typeof image.url === "string" ? image.url.trim() : ""
      const imageId =
        typeof image.image_id === "string" ? image.image_id.trim() : ""
      const code = typeof image.code === "string" ? image.code.trim() : ""

      if (!url || !imageId || !code) {
        return null
      }

      return {
        image_id: imageId,
        code,
        url,
        original_filename:
          typeof image.original_filename === "string"
            ? image.original_filename
            : "",
        alt: typeof image.alt === "string" ? image.alt : "",
        sort_order:
          typeof image.sort_order === "number"
            ? image.sort_order
            : Number(image.sort_order || 0),
        visibility: image.visibility === "hidden" ? "hidden" : "visible",
      }
    })
    .filter((image): image is TtvExploreGalleryImage => Boolean(image))
    .sort((first, second) => first.sort_order - second.sort_order)
}
