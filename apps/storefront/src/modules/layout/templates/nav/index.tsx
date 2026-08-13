// Template ghép dữ liệu và component để dựng khu vực nav.

import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { getTtvSiteConfig } from "@lib/data/ttv"
import { listTtvExploreGroups } from "@lib/data/ttv-explore"
import { toTtvExploreNavGroups } from "@lib/util/ttv-navigation"
import { User } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import MegaMenu from "@modules/layout/components/mega-menu"
import NavCountrySelect from "@modules/layout/components/nav-country-select"

export default async function Nav() {
  const [siteConfig, exploreGroups, regions] =
    await Promise.all([
      getTtvSiteConfig(),
      listTtvExploreGroups(),
      listRegions().catch(() => []),
    ])
  const navGroups = toTtvExploreNavGroups(exploreGroups)
  const customNavGroups = [
    {
      id: "custom",
      label: "Custom",
      links: [
        {
          id: "custom-hexagon",
          label: "Custom tranh lục giác",
          href: "/custom/tranh-luc-giac",
        },
        {
          id: "custom-wall",
          label: "Build Wall",
          href: "/custom-wall",
        },
      ],
    },
  ]

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b border-white/10 bg-[#10131a] text-white duration-200">
        <nav className="content-container txt-xsmall-plus flex h-full w-full items-center justify-between text-small-regular">
          <div className="flex h-full items-center gap-x-7">
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus uppercase tracking-normal text-white hover:text-white/80"
              data-testid="nav-store-link"
            >
              {siteConfig.siteName}
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/"
              className="hidden text-white/70 hover:text-white small:block"
            >
              Home
            </LocalizedClientLink>
            <MegaMenu groups={navGroups} triggerLabel="Explore" />
            <MegaMenu groups={customNavGroups} triggerLabel="Custom" />
            <LocalizedClientLink
              href="/about-us"
              className="hidden text-white/70 hover:text-white small:block"
            >
              About Us
            </LocalizedClientLink>
          </div>

          <div className="flex h-full items-center justify-end gap-x-6">
            <LocalizedClientLink
              href="/account"
              className="grid h-9 w-9 place-items-center text-white/75 transition-colors hover:text-white"
              aria-label="Account"
              data-testid="nav-account-link"
            >
              <User />
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="flex gap-2 text-white/70 hover:text-white"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
            <div className="hidden text-white/70 small:flex">
              <NavCountrySelect regions={regions} />
            </div>
          </div>
        </nav>
      </header>
    </div>
  )
}
