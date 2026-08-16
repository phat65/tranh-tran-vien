import { Select } from "@medusajs/ui"

import type { BulkExploreGroup } from "../lib/explore-bulk-assignment"

export function ExploreHeadingSelect({
  groups,
  value,
  onChange,
}: {
  groups: BulkExploreGroup[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field label="Explore Heading">
      <Select value={value} onValueChange={onChange}>
        <Select.Trigger aria-label="Explore Heading">
          <Select.Value placeholder="Choose a heading" />
        </Select.Trigger>
        <Select.Content>
          {groups.map((group) => (
            <Select.Item key={group.code} value={group.code}>
              {group.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </Field>
  )
}

export function ExploreItemSelect({
  group,
  value,
  onChange,
}: {
  group?: BulkExploreGroup
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field label="Explore Item">
      <Select
        value={value}
        onValueChange={onChange}
        disabled={!group || !group.terms.length}
      >
        <Select.Trigger aria-label="Explore Item">
          <Select.Value
            placeholder={group ? "Choose an item" : "Choose a heading first"}
          />
        </Select.Trigger>
        <Select.Content>
          {(group?.terms ?? []).map((term) => (
            <Select.Item key={term.id} value={term.id}>
              {term.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </Field>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2 text-small-regular text-ui-fg-subtle">
      <span>{label}</span>
      {children}
    </div>
  )
}
