import {
  getCustomArtworkCropExport,
  getCustomArtworkCropPreviewStyle,
  getCustomArtworkSelection,
} from "../order-custom-artwork"

describe("order custom artwork metadata", () => {
  it("returns the customer upload snapshot stored on an order line item", () => {
    expect(
      getCustomArtworkSelection({
        id: "ordli_custom",
        title: "Poster",
        metadata: {
          ttv_source: "custom_hexagon_page",
          ttv_custom_display_title: "Ảnh gia đình",
          ttv_custom_image_url:
            "http://localhost:9000/static/custom-wall-uploads/family.png",
          ttv_custom_original_filename: "family.png",
          ttv_crop: {
            offsetX: 20,
            offsetY: -15,
            zoom: 2,
            imageRatio: 1.5,
          },
        },
      }),
    ).toEqual({
      lineItemId: "ordli_custom",
      displayTitle: "Ảnh gia đình",
      imageUrl: "http://localhost:9000/static/custom-wall-uploads/family.png",
      filename: "family.png",
      sourceLabel: "Custom hexagon",
      crop: {
        offsetX: 20,
        offsetY: -15,
        zoom: 2,
        imageRatio: 1.5,
      },
    })
  })

  it("recreates the storefront crop and export coordinates", () => {
    const crop = {
      offsetX: 20,
      offsetY: -15,
      zoom: 2,
      imageRatio: 1.5,
    }

    expect(getCustomArtworkCropPreviewStyle(crop)).toEqual({
      height: "100%",
      left: "calc(50% + 5.88235294117647%)",
      top: "calc(50% + -3.8461538461538463%)",
      transform: "translate(-50%, -50%) scale(2)",
      width: "172.05882352941177%",
    })

    expect(getCustomArtworkCropExport(crop, 3000, 2000)).toEqual({
      sourceX: 1012.8205128205129,
      sourceY: 538.4615384615385,
      sourceWidth: 871.7948717948718,
      sourceHeight: 1000,
      outputWidth: 871,
      outputHeight: 1000,
    })
  })

  it("clamps invalid crop metadata to safe defaults", () => {
    const selection = getCustomArtworkSelection({
      id: "ordli_invalid_crop",
      metadata: {
        ttv_custom_image_url: "/static/custom.png",
        ttv_crop: {
          offsetX: Number.POSITIVE_INFINITY,
          offsetY: -999,
          zoom: 99,
          imageRatio: -1,
        },
      },
    })

    expect(selection?.crop).toEqual({
      offsetX: 0,
      offsetY: -585,
      zoom: 4,
      imageRatio: null,
    })
  })

  it("rejects unsafe image URLs from line-item metadata", () => {
    expect(
      getCustomArtworkSelection({
        id: "ordli_unsafe",
        metadata: {
          ttv_custom_image_url: "javascript:alert(1)",
        },
      }),
    ).toBeNull()

    expect(
      getCustomArtworkSelection({
        id: "ordli_protocol_relative",
        metadata: {
          ttv_custom_image_url: "//untrusted.example/image.png",
        },
      }),
    ).toBeNull()
  })
})
