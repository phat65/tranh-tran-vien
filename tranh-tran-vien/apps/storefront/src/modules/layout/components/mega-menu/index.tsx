"use client"

// Component giao diện xử lý phần mega menu trong storefront.

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react"
import type { TtvNavGroup } from "@lib/util/ttv-navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

type MegaMenuProps = {
  groups: TtvNavGroup[]
  triggerLabel?: string
}

const MegaMenu = ({ groups, triggerLabel = "Explore" }: MegaMenuProps) => {
  const visibleGroups = groups

  return (
    <Popover className="relative flex h-full items-center">
      {({ close }) => (
        <>
          <PopoverButton className="h-full border-b-2 border-transparent text-white/70 hover:border-white hover:text-white focus:outline-none data-[active]:border-white data-[active]:text-white">
            {triggerLabel}
          </PopoverButton>
          <PopoverPanel className="fixed inset-x-0 top-16 z-50 border-b border-white/10 bg-[#050817] text-white shadow-elevation-card-rest">
            <div className="content-container grid grid-cols-1 gap-x-12 gap-y-8 py-8 small:grid-cols-2 large:grid-cols-5">
              {visibleGroups.map((group) => (
                <div key={group.id} className="grid content-start gap-3">
                  {group.image_url ? (
                    <div className="relative mb-1 aspect-[4/3] overflow-hidden rounded bg-white/5">
                      <Image
                        src={group.image_url}
                        alt={group.label}
                        fill
                        sizes="220px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <p className="txt-compact-small-plus text-white">
                    {group.label}
                  </p>
                  <ul className="grid max-h-[60vh] gap-2 overflow-y-auto pr-2">
                    {group.links.map((link) => (
                      <li key={link.id}>
                        <LocalizedClientLink
                          href={link.href}
                          className="group/link flex items-center gap-3 text-white/65 hover:text-white"
                          onClick={close}
                        >
                          {link.image_url ? (
                            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-white/5">
                              <Image
                                src={link.image_url}
                                alt=""
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </span>
                          ) : null}
                          <span className="txt-small">{link.label}</span>
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
