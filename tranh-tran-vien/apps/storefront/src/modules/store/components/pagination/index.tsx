"use client"

import ChevronDown from "@modules/common/icons/chevron-down"
import { clx } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type PageItem = number | "start-ellipsis" | "end-ellipsis"

export function Pagination({
  page,
  totalPages,
  "data-testid": dataTestid,
}: {
  page: number
  totalPages: number
  "data-testid"?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const arrayRange = (start: number, stop: number) =>
    Array.from({ length: stop - start + 1 }, (_, index) => start + index)

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) {
      return
    }

    const params = new URLSearchParams(searchParams)

    if (newPage === 1) {
      params.delete("page")
    } else {
      params.set("page", newPage.toString())
    }

    const nextQuery = params.toString()

    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  const renderPageButton = (p: number) => (
    <button
      key={p}
      type="button"
      aria-current={p === page ? "page" : undefined}
      className={clx(
        "grid h-9 w-9 place-items-center rounded-full border text-small-regular transition-colors",
        p === page
          ? "border-ui-fg-base bg-ui-fg-base text-ui-bg-base"
          : "border-ui-border-strong bg-white text-ui-fg-base hover:bg-ui-bg-subtle"
      )}
      disabled={p === page}
      onClick={() => handlePageChange(p)}
    >
      {p}
    </button>
  )

  const renderEllipsis = (key: string) => (
    <span
      key={key}
      className="grid h-9 w-9 place-items-center text-small-regular text-ui-fg-subtle"
    >
      ...
    </span>
  )

  const getPageItems = (): PageItem[] => {
    if (totalPages <= 7) {
      return arrayRange(1, totalPages)
    }

    if (page <= 3) {
      return [...arrayRange(1, 4), "end-ellipsis", totalPages]
    }

    if (page >= totalPages - 2) {
      return [1, "start-ellipsis", ...arrayRange(totalPages - 3, totalPages)]
    }

    return [
      1,
      "start-ellipsis",
      page - 1,
      page,
      page + 1,
      "end-ellipsis",
      totalPages,
    ]
  }

  return (
    <div className="mt-12 flex w-full justify-center px-4 py-6">
      <div
        className="flex items-center gap-3"
        data-testid={dataTestid}
        aria-label="Pagination"
      >
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          className="grid h-9 w-9 place-items-center rounded-full border border-ui-border-strong bg-white text-ui-fg-base transition-colors hover:bg-ui-bg-subtle disabled:cursor-not-allowed disabled:border-ui-border-base disabled:text-ui-fg-disabled"
          onClick={() => handlePageChange(page - 1)}
        >
          <ChevronDown className="rotate-90" size={16} />
        </button>

        {getPageItems().map((item) =>
          typeof item === "number" ? renderPageButton(item) : renderEllipsis(item)
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          className="grid h-9 w-9 place-items-center rounded-full border border-ui-border-strong bg-white text-ui-fg-base transition-colors hover:bg-ui-bg-subtle disabled:cursor-not-allowed disabled:border-ui-border-base disabled:text-ui-fg-disabled"
          onClick={() => handlePageChange(page + 1)}
        >
          <ChevronDown className="-rotate-90" size={16} />
        </button>
      </div>
    </div>
  )
}
