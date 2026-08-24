import { canonicalizeImageProductLineMetadata } from "../image-product-cart";

const product = {
  id: "prod_dragonball",
  title: "Dragon Ball",
  handle: "dragon-ball",
  images: [
    {
      id: "img_vegeta",
      url: "http://localhost:9000/static/vegeta.jpg",
      metadata: {
        role: "primary",
        title: "Vegeta",
        handle: "vegeta",
        code: "DB-002",
        active: true,
      },
    },
    {
      id: "img_goku",
      url: "http://localhost:9000/static/goku.jpg",
      metadata: {
        role: "primary",
        title: "Goku",
        handle: "goku",
        code: "DB-001",
        active: true,
      },
    },
    {
      id: "img_goku_detail",
      url: "http://localhost:9000/static/goku-detail.jpg",
      metadata: {
        role: "gallery",
        primary_image_id: "img_goku",
        active: true,
      },
    },
  ],
};

function createScope() {
  return {
    resolve: jest.fn().mockReturnValue({
      graph: jest.fn().mockResolvedValue({
        data: [{ id: "variant_default", product }],
      }),
    }),
  };
}

describe("image product cart metadata", () => {
  it("validates a primary image and snapshots its production/gallery files", async () => {
    const result = await canonicalizeImageProductLineMetadata({
      scope: createScope() as never,
      variantId: "variant_default",
      metadata: { ttv_image_id: "img_goku" },
    });

    expect(result).toEqual(
      expect.objectContaining({
        ttv_virtual_product_id: "imgprod_img_goku",
        ttv_parent_product_id: product.id,
        ttv_primary_image_id: "img_goku",
        ttv_display_image_url: product.images[1].url,
        ttv_print_file_url: product.images[1].url,
        ttv_gallery_image_urls: [product.images[2].url],
      })
    );

    expect(result.ttv_display_image_url).not.toBe(product.images[0].url);
  });

  it("does not allow a gallery image to be purchased directly", async () => {
    await expect(
      canonicalizeImageProductLineMetadata({
        scope: createScope() as never,
        variantId: "variant_default",
        metadata: { ttv_image_id: "img_goku_detail" },
      })
    ).rejects.toThrow("not an active primary image");
  });
});
