// Component giao diện xử lý phần divider trong storefront.

import { clx } from "@modules/common/components/ui"

const Divider = ({ className }: { className?: string }) => (
  <div
    className={clx("h-px w-full border-b border-gray-200 mt-1", className)}
  />
)

export default Divider
