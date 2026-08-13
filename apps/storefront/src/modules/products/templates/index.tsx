// Template ghép dữ liệu và component để dựng khu vực products.

import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import FeedbackList from "@modules/products/components/feedback-list"
import ProductActions from "@modules/products/components/product-actions"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import type { TtvSelectedExploreImage } from "@lib/data/ttv-explore"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  selectedExploreImage?: TtvSelectedExploreImage | null
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
  selectedExploreImage,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <>
      <div
        className="content-container grid gap-10 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start"
        data-testid="product-container"
      >
        <div className="w-full">
          <ImageGallery images={images} />
        </div>
        <div className="flex w-full flex-col gap-y-8 lg:sticky lg:top-28">
          <ProductInfo product={product} />
          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
              />
            }
          >
            <ProductActionsWrapper
              id={product.id}
              region={region}
              selectedExploreImage={selectedExploreImage}
            />
          </Suspense>
        </div>
      </div>
      <div className="content-container">
        <ProductTabs product={product} />
      </div>
      <div
        className="content-container my-16 small:my-24 flex flex-col gap-y-16"
        data-testid="related-products-container"
      >
        <Suspense fallback={null}>
          <FeedbackList productId={product.id} />
        </Suspense>
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
