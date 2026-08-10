import { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Us",
  description: "Gioi thieu ve Tranh Tran Vien.",
}

export default function AboutUsPage() {
  return (
    <main className="bg-white">
      <section className="border-b border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-12 small:py-16">
          <p className="txt-compact-small-plus mb-4 text-ui-fg-subtle">
            About Us
          </p>
          <h1 className="max-w-[46rem] text-[2.75rem] font-semibold leading-[0.98] tracking-normal text-ui-fg-base small:text-[4rem]">
            Tranh Tran Vien
          </h1>
          <p className="mt-6 max-w-[42rem] text-base leading-7 text-ui-fg-subtle">
            Chung toi tap trung vao tranh decor luc giac, khung Pokemon va
            cac bo suu tap theo chu de cho goc trung bay gon, dep va de lap
            dat.
          </p>
        </div>
      </section>

      <section className="content-container grid gap-8 py-12 small:grid-cols-3">
        <div className="border-t border-ui-border-base pt-5">
          <h2 className="txt-compact-large-plus text-ui-fg-base">
            Thiet ke theo bo
          </h2>
          <p className="mt-3 text-small-regular leading-6 text-ui-fg-subtle">
            San pham duoc sap theo danh muc va collection de khach de chon
            dung chu de.
          </p>
        </div>
        <div className="border-t border-ui-border-base pt-5">
          <h2 className="txt-compact-large-plus text-ui-fg-base">
            Hinh anh ro rang
          </h2>
          <p className="mt-3 text-small-regular leading-6 text-ui-fg-subtle">
            Anh san pham duoc giu dung ti le, khong cat vao form luc giac.
          </p>
        </div>
        <div className="border-t border-ui-border-base pt-5">
          <h2 className="txt-compact-large-plus text-ui-fg-base">
            Combo trong san pham
          </h2>
          <p className="mt-3 text-small-regular leading-6 text-ui-fg-subtle">
            Uu dai combo duoc hien trong trang san pham va gio hang, khong
            tach thanh mot trang rieng.
          </p>
        </div>
      </section>
    </main>
  )
}
