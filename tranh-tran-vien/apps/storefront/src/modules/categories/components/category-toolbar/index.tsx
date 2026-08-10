"use client"

// Component giao diện xử lý phần category toolbar trong storefront.

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type CategoryToolbarProps = {
  q?: string
  sortBy: SortOptions
  searchPlaceholder: string
}

const sortOptions: { value: SortOptions; label: string }[] = [
  { value: "created_at", label: "Mới nhất" },
  { value: "title_asc", label: "A-Z" },
  { value: "title_desc", label: "Z-A" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
]

export default function CategoryToolbar({
  q = "",
  sortBy,
  searchPlaceholder,
}: CategoryToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(q)

  const updateQuery = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    updater(params)
    params.delete("page")

    const nextQuery = params.toString()
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    updateQuery((params) => {
      const value = search.trim()

      if (value) {
        params.set("q", value)
      } else {
        params.delete("q")
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 border-y border-ui-border-base py-4 small:flex-row small:items-center small:justify-between">
      <form className="flex w-full gap-2 small:max-w-[26rem]" onSubmit={submitSearch}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full border border-ui-border-base bg-white px-3 text-small-regular outline-none transition-colors placeholder:text-ui-fg-muted focus:border-ui-border-strong"
        />
        <button
          type="submit"
          className="h-10 border border-ui-border-strong px-4 text-small-regular text-ui-fg-base transition-colors hover:bg-ui-bg-subtle"
        >
          Search
        </button>
      </form>

      <label className="flex items-center gap-3 text-small-regular text-ui-fg-subtle">
        Sort by
        <select
          value={sortBy}
          onChange={(event) =>
            updateQuery((params) =>
              params.set("sortBy", event.target.value as SortOptions)
            )
          }
          className="h-10 min-w-[10rem] border border-ui-border-base bg-white px-3 text-ui-fg-base outline-none transition-colors focus:border-ui-border-strong"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
