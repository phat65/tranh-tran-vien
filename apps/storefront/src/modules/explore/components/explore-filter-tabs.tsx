import type { TtvExploreGroup } from "@lib/data/ttv-explore"
import { getPublicExploreTermSlug } from "@lib/util/ttv-navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ExploreFilterTabsProps = {
  destinationName: string
  destinationHeadingSlug: string
  destinationTermSlug: string
  filterGroup: TtvExploreGroup
  selectedFilterSlug?: string
  q?: string
  sortBy?: string
}

export default function ExploreFilterTabs({
  destinationName,
  destinationHeadingSlug,
  destinationTermSlug,
  filterGroup,
  selectedFilterSlug,
  q,
  sortBy,
}: ExploreFilterTabsProps) {
  const basePath = `/explore/${destinationHeadingSlug}/${destinationTermSlug}`

  return (
    <nav
      aria-label={`${destinationName} filters`}
      className="border-b border-ui-border-base"
    >
      <div className="content-container flex min-h-16 items-center gap-3 overflow-x-auto py-3">
        <FilterTab
          active={!selectedFilterSlug}
          href={buildHref(basePath, { q, sortBy })}
          label={`All ${destinationName}`}
        />
        {filterGroup.terms.map((term) => {
          const termSlug = getPublicExploreTermSlug(term)

          return (
            <FilterTab
              key={term.id}
              active={selectedFilterSlug === termSlug}
              href={buildHref(basePath, {
                filter: termSlug,
                q,
                sortBy,
              })}
              label={term.name}
            />
          )
        })}
      </div>
    </nav>
  )
}

function FilterTab({
  active,
  href,
  label,
}: {
  active: boolean
  href: string
  label: string
}) {
  return (
    <LocalizedClientLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 shrink-0 items-center border px-4 text-small-regular font-semibold transition-colors ${
        active
          ? "border-ui-border-interactive bg-ui-bg-interactive text-ui-fg-on-color"
          : "border-ui-border-base bg-ui-bg-base text-ui-fg-subtle hover:border-ui-border-strong hover:text-ui-fg-base"
      }`}
    >
      {label}
    </LocalizedClientLink>
  )
}

function buildHref(
  path: string,
  values: {
    filter?: string
    q?: string
    sortBy?: string
  }
) {
  const params = new URLSearchParams()

  if (values.filter) {
    params.set("filter", values.filter)
  }

  if (values.q) {
    params.set("q", values.q)
  }

  if (values.sortBy) {
    params.set("sortBy", values.sortBy)
  }

  const query = params.toString()

  return query ? `${path}?${query}` : path
}
