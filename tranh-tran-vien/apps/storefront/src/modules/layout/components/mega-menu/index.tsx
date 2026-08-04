"use client"

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react"
import type { TtvNavGroup } from "@lib/util/ttv-navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type MegaMenuProps = {
  groups: TtvNavGroup[]
  triggerLabel?: string
}

const MegaMenu = ({ groups, triggerLabel = "Store" }: MegaMenuProps) => {
  const categoryGroup = groups.find((group) => group.id === "categories")
  const collectionGroup = groups.find((group) => group.id === "collections")
  const visibleGroups = [categoryGroup, collectionGroup].filter(
    Boolean
  ) as TtvNavGroup[]

  return (
    <Popover className="relative flex h-full items-center">
      {({ close }) => (
        <>
          <PopoverButton className="h-full text-ui-fg-subtle hover:text-ui-fg-base focus:outline-none">
            {triggerLabel}
          </PopoverButton>
          <PopoverPanel className="fixed inset-x-0 top-16 z-50 border-b border-ui-border-base bg-white shadow-elevation-card-rest">
            <div className="content-container grid grid-cols-1 gap-x-12 gap-y-8 py-8 small:grid-cols-[0.45fr_1fr_1fr]">
              <div className="grid content-start gap-3">
                <p className="txt-compact-small-plus text-ui-fg-base">
                  Store
                </p>
                <LocalizedClientLink
                  href="/store"
                  className="txt-small text-ui-fg-subtle hover:text-ui-fg-base"
                  onClick={close}
                >
                  All products
                </LocalizedClientLink>
              </div>
              {visibleGroups.map((group) => (
                <div key={group.id} className="grid content-start gap-3">
                  <p className="txt-compact-small-plus text-ui-fg-base">
                    {group.label}
                  </p>
                  <ul className="grid max-h-[60vh] gap-2 overflow-y-auto pr-2">
                    {group.links.map((link) => (
                      <li key={link.id}>
                        <LocalizedClientLink
                          href={link.href}
                          className="txt-small text-ui-fg-subtle hover:text-ui-fg-base"
                          onClick={close}
                        >
                          {link.label}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </PopoverPanel>
        </>
      )}
    </Popover>
  )
}

export default MegaMenu
