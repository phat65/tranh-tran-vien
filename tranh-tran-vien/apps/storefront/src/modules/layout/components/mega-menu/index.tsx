"use client"

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react"
import type { TtvNavGroup } from "@lib/util/ttv-navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type MegaMenuProps = {
  groups: TtvNavGroup[]
  triggerLabel?: string
}

const MegaMenu = ({ groups, triggerLabel = "Explore" }: MegaMenuProps) => {
  const categoryGroup = groups.find((group) => group.id === "categories")
  const collectionGroup = groups.find((group) => group.id === "collections")
  const defaultGroups = [categoryGroup, collectionGroup].filter(
    Boolean
  ) as TtvNavGroup[]
  const visibleGroups = defaultGroups.length ? defaultGroups : groups

  return (
    <Popover className="relative flex h-full items-center">
      {({ close }) => (
        <>
          <PopoverButton className="h-full border-b-2 border-transparent text-white/70 hover:border-white hover:text-white focus:outline-none data-[active]:border-white data-[active]:text-white">
            {triggerLabel}
          </PopoverButton>
          <PopoverPanel className="fixed inset-x-0 top-16 z-50 border-b border-white/10 bg-[#10131a] text-white shadow-elevation-card-rest">
            <div className="content-container grid grid-cols-1 gap-x-12 gap-y-8 py-8 small:grid-cols-2">
              {visibleGroups.map((group) => (
                <div key={group.id} className="grid content-start gap-3">
                  <p className="txt-compact-small-plus text-white">
                    {group.label}
                  </p>
                  <ul className="grid max-h-[60vh] gap-2 overflow-y-auto pr-2">
                    {group.links.map((link) => (
                      <li key={link.id}>
                        <LocalizedClientLink
                          href={link.href}
                          className="txt-small text-white/65 hover:text-white"
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
