import {
  Button,
  Heading,
  RadioGroup,
  Select,
  Switch,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { ReactNode, useEffect, useMemo, useState } from "react"

import type { ExploreNavigationMode } from "../../lib/explore-navigation"

export type ExploreNavigationAdminTerm = {
  id: string
  name: string
  slug: string
  status: "draft" | "active" | "archived"
  sort_order: number
  metadata?: Record<string, unknown> | null
}

export type ExploreNavigationAdminGroup = {
  code: string
  label: string
  slug: string
  sort_order: number
  taxonomy_id?: string | null
  metadata?: Record<string, unknown> | null
  terms: ExploreNavigationAdminTerm[]
  navigation: {
    mode: ExploreNavigationMode
    auto_assign_target: boolean
    target: {
      heading_code: string
      heading_label: string
      heading_slug: string
      term_id: string
      term_name: string
      term_slug: string
    } | null
  }
}

type ExploreNavigationSettingsProps = {
  groups: ExploreNavigationAdminGroup[]
  onSaved: () => Promise<void>
}

type SaveResponse = {
  backfilled_product_count: number
}

const CONFIGURATION_API =
  "/admin/tranh-tran-vien/catalog/explore/configuration"

export function ExploreNavigationSettings({
  groups,
  onSaved,
}: ExploreNavigationSettingsProps) {
  const prompt = usePrompt()
  const [sourceHeadingCode, setSourceHeadingCode] = useState("")
  const [mode, setMode] = useState<ExploreNavigationMode>("standalone")
  const [targetHeadingCode, setTargetHeadingCode] = useState("")
  const [targetTermId, setTargetTermId] = useState("")
  const [autoAssignTarget, setAutoAssignTarget] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const sourceGroup = useMemo(
    () =>
      groups.find((group) => group.code === sourceHeadingCode) ?? groups[0],
    [groups, sourceHeadingCode]
  )
  const destinationGroups = useMemo(
    () =>
      groups.filter(
        (group) =>
          group.code !== sourceGroup?.code &&
          group.navigation.mode === "standalone" &&
          group.terms.some((term) => term.status === "active")
      ),
    [groups, sourceGroup?.code]
  )
  const targetGroup = useMemo(
    () =>
      destinationGroups.find(
        (group) => group.code === targetHeadingCode
      ),
    [destinationGroups, targetHeadingCode]
  )
  const targetTerm = targetGroup?.terms.find(
    (term) => term.id === targetTermId && term.status === "active"
  )
  const canSave =
    Boolean(sourceGroup) &&
    (mode === "standalone" || Boolean(targetGroup && targetTerm))

  useEffect(() => {
    if (!sourceGroup) {
      return
    }

    const navigation = sourceGroup.navigation

    setMode(navigation.mode)
    setTargetHeadingCode(navigation.target?.heading_code ?? "")
    setTargetTermId(navigation.target?.term_id ?? "")
    setAutoAssignTarget(navigation.auto_assign_target)
  }, [sourceGroup])

  const changeMode = (value: string) => {
    const nextMode = value as ExploreNavigationMode

    setMode(nextMode)

    if (nextMode === "standalone") {
      setTargetHeadingCode("")
      setTargetTermId("")
      setAutoAssignTarget(false)
    } else {
      setAutoAssignTarget(true)
    }
  }

  const save = async () => {
    if (!sourceGroup || !canSave) {
      return
    }

    const confirmed = await prompt({
      title: "Save heading behavior?",
      description:
        mode === "filter_tabs" && autoAssignTarget
          ? "Existing products in this tab group will be added to the destination item when needed. Existing assignments will not be removed."
          : "This changes where links in this Explore heading open. Existing product assignments will not be removed.",
      confirmText: "Save behavior",
      cancelText: "Cancel",
      variant: "confirmation",
    })

    if (!confirmed) {
      return
    }

    setIsSaving(true)

    try {
      const response = await adminFetch<SaveResponse>(CONFIGURATION_API, {
        method: "PUT",
        body: JSON.stringify(
          mode === "filter_tabs"
            ? {
                source_heading_code: sourceGroup.code,
                mode,
                target_term_id: targetTermId,
                auto_assign_target: autoAssignTarget,
              }
            : {
                source_heading_code: sourceGroup.code,
                mode,
              }
        ),
      })

      await onSaved()

      const backfillMessage = response.backfilled_product_count
        ? ` ${response.backfilled_product_count} existing products were added to the destination item.`
        : ""

      toast.success(`Heading behavior saved.${backfillMessage}`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save heading behavior"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="grid gap-5">
      <div>
        <Heading level="h2">Heading behavior</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          Choose whether items open their own pages or become filter tabs on
          another Explore page.
        </Text>
      </div>

      <Field label="Explore Heading">
        <Select
          value={sourceGroup?.code ?? ""}
          onValueChange={setSourceHeadingCode}
        >
          <Select.Trigger>
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

      <Field label="Display">
        <RadioGroup
          aria-label="Explore heading display behavior"
          className="grid gap-2 md:grid-cols-2"
          value={mode}
          onValueChange={changeMode}
        >
          <RadioGroup.ChoiceBox
            value="standalone"
            label="Standalone pages"
            description="Each item opens its own Explore page."
          />
          <RadioGroup.ChoiceBox
            value="filter_tabs"
            label="Filter tabs"
            description="Items appear as tabs on another Explore page."
          />
        </RadioGroup>
      </Field>

      {mode === "filter_tabs" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Destination Heading">
            <Select
              value={targetHeadingCode}
              onValueChange={(value) => {
                setTargetHeadingCode(value)
                setTargetTermId("")
              }}
            >
              <Select.Trigger>
                <Select.Value placeholder="Choose a destination heading" />
              </Select.Trigger>
              <Select.Content>
                {destinationGroups.map((group) => (
                  <Select.Item key={group.code} value={group.code}>
                    {group.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>

          <Field label="Destination Item">
            <Select
              value={targetTermId}
              onValueChange={setTargetTermId}
              disabled={!targetGroup}
            >
              <Select.Trigger>
                <Select.Value placeholder="Choose a destination item" />
              </Select.Trigger>
              <Select.Content>
                {(targetGroup?.terms ?? [])
                  .filter((term) => term.status === "active")
                  .map((term) => (
                    <Select.Item key={term.id} value={term.id}>
                      {term.name}
                    </Select.Item>
                  ))}
              </Select.Content>
            </Select>
          </Field>

          <label className="flex items-start justify-between gap-4 md:col-span-2">
            <span>
              <Text size="small" weight="plus">
                Automatically include destination
              </Text>
              <Text className="text-ui-fg-subtle" size="xsmall">
                Products added to any tab are also added to the destination
                item. Removing a tab never removes the destination.
              </Text>
            </span>
            <Switch
              checked={autoAssignTarget}
              onCheckedChange={setAutoAssignTarget}
              aria-label="Automatically include destination item"
            />
          </label>
        </div>
      ) : null}

      {sourceGroup?.navigation.mode === "filter_tabs" &&
      sourceGroup.navigation.target ? (
        <Text className="text-ui-fg-subtle" size="small">
          Current destination: {sourceGroup.navigation.target.heading_label} /{" "}
          {sourceGroup.navigation.target.term_name}
        </Text>
      ) : null}

      <div>
        <Button
          type="button"
          onClick={save}
          disabled={!canSave}
          isLoading={isSaving}
        >
          Save behavior
        </Button>
      </div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="grid gap-2">
      <Text size="small" weight="plus">
        {label}
      </Text>
      {children}
    </label>
  )
}

async function adminFetch<T>(input: string, init: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    let message = text || `Request failed with status ${response.status}`

    try {
      const payload = JSON.parse(text) as { message?: unknown }

      if (typeof payload.message === "string" && payload.message.trim()) {
        message = payload.message
      }
    } catch {}

    throw new Error(message)
  }

  return response.json() as Promise<T>
}
