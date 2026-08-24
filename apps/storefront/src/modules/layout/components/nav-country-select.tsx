"use client"

// Component giao diện xử lý phần nav country select trong storefront.

import useToggleState from "@lib/hooks/use-toggle-state"
import { HttpTypes } from "@medusajs/types"
import CountrySelect from "@modules/layout/components/country-select"

type NavCountrySelectProps = {
  regions: HttpTypes.StoreRegion[] | null
}

const NavCountrySelect = ({ regions }: NavCountrySelectProps) => {
  const countryToggleState = useToggleState()

  if (!regions?.length) {
    return null
  }

  return (
    <div
      className="relative flex min-w-[8rem] justify-end"
      onMouseEnter={countryToggleState.open}
      onMouseLeave={countryToggleState.close}
    >
      <CountrySelect
        toggleState={countryToggleState}
        regions={regions}
        align="right"
      />
    </div>
  )
}

export default NavCountrySelect
