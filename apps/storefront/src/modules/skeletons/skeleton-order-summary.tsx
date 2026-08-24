// Component giao diện xử lý phần skeleton order summary trong storefront.

import SkeletonButton from "@modules/skeletons/skeleton-button"
import SkeletonCartTotals from "@modules/skeletons/skeleton-cart-totals"

const SkeletonOrderSummary = () => {
  return (
    <div className="grid-cols-1">
      <SkeletonCartTotals header={false} />
      <div className="mt-4">
        <SkeletonButton />
      </div>
    </div>
  )
}

export default SkeletonOrderSummary
