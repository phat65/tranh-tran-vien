import {
  buildImageProductMetadata,
  normalizeImageProductMetadata,
  promoteGalleryImage,
  projectImageProducts,
} from "../image-products"

describe("image products", () => {
  it("builds editable metadata from an uploaded filename", () => {
    expect(
      buildImageProductMetadata({
        parentTitle: "Dragon Ball",
        parentHandle: "dragon-ball",
        sequence: 3,
        originalFilename: "goku-ultra-instinct.png",
      })
    ).toEqual({
      title: "Goku Ultra Instinct",
      handle: "dragon-ball-goku-ultra-instinct-3",
      code: "DB-003",
      active: true,
      alt: "Goku Ultra Instinct",
      original_filename: "goku-ultra-instinct.png",
      role: "primary",
      primary_image_id: "",
    })
  })

  it("builds gallery metadata already linked to its primary image", () => {
    expect(
      buildImageProductMetadata({
        parentTitle: "Dragon Ball",
        parentHandle: "dragon-ball",
        sequence: 4,
        originalFilename: "goku-room.jpg",
        role: "gallery",
        primaryImageId: "img_goku",
      })
    ).toMatchObject({
      title: "Goku Room",
      role: "gallery",
      primary_image_id: "img_goku",
    })
  })

  it("projects every active ProductImage as a virtual storefront product", () => {
    const products = projectImageProducts([
      {
        id: "prod_dragonball",
        title: "Dragon Ball",
        handle: "dragon-ball",
        collection_id: "pcol_anime",
        categories: [{ id: "pcat_anime" }],
        variants: [{ id: "variant_default", manage_inventory: false }],
        images: [
          {
            id: "img_goku",
            url: "https://cdn.example/goku.png",
            metadata: {
              title: "Goku Ultra Instinct",
              handle: "goku-ultra-instinct",
              code: "DB-001",
              active: true,
              alt: "Tranh Goku Ultra Instinct",
            },
          },
          {
            id: "img_hidden",
            url: "https://cdn.example/hidden.png",
            metadata: { active: false },
          },
          {
            id: "img_goku_mockup",
            url: "https://cdn.example/goku-mockup.png",
            metadata: {
              role: "gallery",
              primary_image_id: "img_goku",
              active: true,
              alt: "Goku room mockup",
            },
          },
        ],
      },
    ])

    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      id: "imgprod_img_goku",
      parent_product_id: "prod_dragonball",
      image_id: "img_goku",
      title: "Goku Ultra Instinct",
      handle: "goku-ultra-instinct",
      thumbnail: "https://cdn.example/goku.png",
      images: [{ id: "img_goku" }, { id: "img_goku_mockup" }],
      gallery_image_ids: ["img_goku_mockup"],
      production_image_url: "https://cdn.example/goku.png",
      collection_id: "pcol_anime",
      categories: [{ id: "pcat_anime" }],
      variants: [{ id: "variant_default", manage_inventory: false }],
      metadata: {
        ttv_virtual_product: true,
        ttv_parent_product_id: "prod_dragonball",
        ttv_image_id: "img_goku",
      },
    })
  })

  it("does not expose orphan gallery images as storefront products", () => {
    const products = projectImageProducts([
      {
        id: "prod_album",
        title: "Album",
        handle: "album",
        images: [
          {
            id: "img_orphan",
            url: "https://cdn.example/orphan.png",
            metadata: {
              role: "gallery",
              primary_image_id: "img_missing",
            },
          },
        ],
      },
    ])

    expect(products).toEqual([])
  })

  it("promotes one gallery image and relinks the previous primary atomically", () => {
    const images = [
      { id: "img_primary", url: "primary.jpg", metadata: { role: "primary" } },
      {
        id: "img_gallery_1",
        url: "gallery-1.jpg",
        metadata: { role: "gallery", primary_image_id: "img_primary" },
      },
      {
        id: "img_gallery_2",
        url: "gallery-2.jpg",
        metadata: { role: "gallery", primary_image_id: "img_primary" },
      },
    ]
    const result = promoteGalleryImage({
      parent: { id: "prod_album", title: "Album", images },
      images,
      galleryImageId: "img_gallery_1",
    })

    expect(result?.images.map((image) => image.metadata)).toEqual([
      { role: "gallery", primary_image_id: "img_gallery_1" },
      { role: "primary", primary_image_id: "" },
      { role: "gallery", primary_image_id: "img_gallery_1" },
    ])
  })

  it("keeps legacy ProductImages visible with stable fallback metadata", () => {
    const image = {
      id: "img_01HXYZ",
      url: "https://cdn.example/legacy.png",
    }
    const metadata = normalizeImageProductMetadata({
      parent: {
        id: "prod_1",
        title: "Dragon Ball - Goku",
        handle: "dragon-ball-goku",
        images: [image],
        variants: [{ sku: "DB-001" }],
      },
      image,
      index: 0,
    })

    expect(metadata).toMatchObject({
      title: "Dragon Ball - Goku",
      handle: "dragon-ball-goku",
      code: "DB-001",
      active: true,
    })
  })
})
