// Trang route storefront render màn hình countryCode / (main) / about us.

import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "Giới thiệu về Tranh Trần Viền.",
}

export default function AboutUsPage() {
  return (
    <main className="bg-white">
      <section className="border-b border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-12 small:py-16">
          <p className="txt-compact-small-plus mb-4 text-ui-fg-subtle">
            Giới thiệu
          </p>
          <h1 className="max-w-[46rem] text-[2.75rem] font-semibold leading-[0.98] tracking-normal text-ui-fg-base small:text-[4rem]">
            Tranh Trần Viền
          </h1>
          <p className="mt-6 max-w-[42rem] text-base leading-7 text-ui-fg-subtle">
            Chúng tôi tập trung vào tranh decor lục giác, khung Pokemon và
            các bộ sưu tập theo chủ đề cho góc trưng bày gọn, đẹp và dễ lắp
            đặt.
          </p>
        </div>
      </section>

      <section className="content-container grid gap-8 py-12 small:grid-cols-3">
        <div className="border-t border-ui-border-base pt-5">
          <h2 className="txt-compact-large-plus text-ui-fg-base">
            Thiết kế theo bộ
          </h2>
          <p className="mt-3 text-small-regular leading-6 text-ui-fg-subtle">
            Sản phẩm được sắp theo danh mục và collection để khách dễ chọn
            đúng chủ đề.
          </p>
        </div>
        <div className="border-t border-ui-border-base pt-5">
          <h2 className="txt-compact-large-plus text-ui-fg-base">
            Hình ảnh rõ ràng
          </h2>
          <p className="mt-3 text-small-regular leading-6 text-ui-fg-subtle">
            Ảnh sản phẩm được giữ đúng tỉ lệ, không cắt vào form lục giác.
          </p>
        </div>
        <div className="border-t border-ui-border-base pt-5">
          <h2 className="txt-compact-large-plus text-ui-fg-base">
            Combo trong sản phẩm
          </h2>
          <p className="mt-3 text-small-regular leading-6 text-ui-fg-subtle">
            Ưu đãi combo được hiện trong trang sản phẩm và giỏ hàng, không
            tách thành một trang riêng.
          </p>
        </div>
      </section>
    </main>
  )
}
