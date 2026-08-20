// Trang admin tùy biến render khu vực tranh tran vien / rules.

import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Table,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { FormEvent, useEffect, useMemo, useState } from "react"
import type { Dispatch, ReactNode, SetStateAction } from "react"

type Status = "draft" | "active" | "archived"
type ScopeType =
  | "all"
  | "product"
  | "category"
  | "collection"
  | "option"
  | "taxonomy"
type DiscountType = "percentage" | "fixed" | "fixed_total"

type RuleOption = {
  id: string
  label: string
  subtitle?: string
}

type RuleOptions = {
  categories: RuleOption[]
  collections: RuleOption[]
  sales_channels: RuleOption[]
  regions: RuleOption[]
}

type ComboTier = {
  minimum_quantity: number
  discount_type: DiscountType
  discount_value: number
  label?: string
  is_featured?: boolean
  is_free_shipping?: boolean
}

type ComboTierForm = {
  minimum_quantity: string
  discount_type: DiscountType
  discount_value: string
  label: string
  is_featured: "true" | "false"
  is_free_shipping: "true" | "false"
}

type ComboRule = {
  id: string
  name: string
  description?: string | null
  scope_type: ScopeType
  product_id?: string | null
  category_id?: string | null
  collection_id?: string | null
  option_value_id?: string | null
  taxonomy_term_id?: string | null
  sales_channel_id?: string | null
  region_id?: string | null
  tiers: ComboTier[]
  priority: number
  is_stackable: boolean
  starts_at?: string | null
  ends_at?: string | null
  status: Status
}

type ComboRuleForm = {
  name: string
  description: string
  scope_type: "category" | "collection"
  scope_id: string
  sales_channel_id: string
  region_id: string
  tiers: ComboTierForm[]
  priority: string
  is_stackable: "true" | "false"
  starts_at: string
  ends_at: string
  status: Status
}

const RULES_API = "/admin/tranh-tran-vien/rules"

const emptyOptions: RuleOptions = {
  categories: [],
  collections: [],
  sales_channels: [],
  regions: [],
}

const emptyTier: ComboTierForm = {
  minimum_quantity: "3",
  discount_type: "fixed_total",
  discount_value: "290000",
  label: "",
  is_featured: "false",
  is_free_shipping: "false",
}

const emptyForm: ComboRuleForm = {
  name: "",
  description: "",
  scope_type: "category",
  scope_id: "",
  sales_channel_id: "",
  region_id: "",
  tiers: [emptyTier],
  priority: "0",
  is_stackable: "false",
  starts_at: "",
  ends_at: "",
  status: "active",
}

const createEmptyForm = (): ComboRuleForm => ({
  ...emptyForm,
  tiers: [{ ...emptyTier }],
})

const TtvRulesPage = () => {
  const [rules, setRules] = useState<ComboRule[]>([])
  const [options, setOptions] = useState<RuleOptions>(emptyOptions)
  const [form, setForm] = useState<ComboRuleForm>(createEmptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  const optionLabels = useMemo(() => {
    return {
      categories: toLabelMap(options.categories),
      collections: toLabelMap(options.collections),
      sales_channels: toLabelMap(options.sales_channels),
      regions: toLabelMap(options.regions),
    }
  }, [options])

  const loadData = async () => {
    setIsLoading(true)

    try {
      const [ruleResponse, optionResponse] = await Promise.all([
        apiFetch<{ combo_rules: ComboRule[] }>("/combo-rules?limit=200"),
        apiFetch<RuleOptions>("/options"),
      ])

      setRules(ruleResponse.combo_rules ?? [])
      setOptions({
        ...emptyOptions,
        ...optionResponse,
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load TTV rules"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const submitComboRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = buildPayload(form)

    if (!payload.name) {
      toast.error("Name is required")
      return
    }

    if (!form.scope_id) {
      toast.error(`Select a ${form.scope_type} for this combo`)
      return
    }

    if (!payload.tiers.length) {
      toast.error("Add at least one combo tier")
      return
    }

    setIsSaving(true)

    try {
      const path = editingRuleId ? `/combo-rules/${editingRuleId}` : "/combo-rules"

      await apiFetch<{ combo_rule: ComboRule }>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      })
      toast.success(editingRuleId ? "Combo rule updated" : "Combo rule saved")
      resetForm()
      await loadData()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save combo rule"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setForm(createEmptyForm())
    setEditingRuleId(null)
  }

  const editRule = (rule: ComboRule) => {
    setForm(ruleToForm(rule))
    setEditingRuleId(rule.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const toggleRuleStatus = async (rule: ComboRule) => {
    const status: Status = rule.status === "active" ? "draft" : "active"

    try {
      await apiFetch(`/combo-rules/${rule.id}`, {
        method: "POST",
        body: JSON.stringify({ status }),
      })
      toast.success(
        status === "active" ? "Combo rule activated" : "Combo rule deactivated"
      )
      await loadData()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update combo rule"
      )
    }
  }

  const deleteRule = async (rule: ComboRule) => {
    if (!window.confirm(`Delete combo rule "${rule.name}"?`)) {
      return
    }

    try {
      await apiFetch(`/combo-rules/${rule.id}`, {
        method: "DELETE",
      })
      toast.success("Combo rule deleted")
      if (editingRuleId === rule.id) {
        resetForm()
      }
      await loadData()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete combo rule"
      )
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">TTV Rules</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Set combo prices for products in a Medusa category or collection.
          </Text>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={loadData}
          isLoading={isLoading}
        >
          Refresh
        </Button>
      </div>

      <form className="grid gap-6 p-6" onSubmit={submitComboRule}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Heading level="h2">
              {editingRuleId ? "Edit combo rule" : "Create combo rule"}
            </Heading>
            {editingRuleId && (
              <Text className="text-ui-fg-subtle" size="small">
                Editing an existing rule. Save to update it, or cancel to create
                a new one.
              </Text>
            )}
          </div>
          {editingRuleId && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel edit
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Rule name">
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Combo tranh luc giac hop kim"
            />
          </Field>

          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, status: value as Status }))
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="draft">Inactive</Select.Item>
                <Select.Item value="active">Active</Select.Item>
              </Select.Content>
            </Select>
          </Field>

          <Field
            label="Combo scope"
            description="Use the same Category or Collection already assigned on the parent Product."
          >
            <Select
              value={form.scope_type}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  scope_type: value as "category" | "collection",
                  scope_id: "",
                }))
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="category">Category</Select.Item>
                <Select.Item value="collection">Collection</Select.Item>
              </Select.Content>
            </Select>
          </Field>

          <Field label={form.scope_type === "category" ? "Category" : "Collection"}>
            <Select
              value={form.scope_id}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, scope_id: value }))
              }
            >
              <Select.Trigger>
                <Select.Value placeholder={`Select a ${form.scope_type}`} />
              </Select.Trigger>
              <Select.Content>
                {(form.scope_type === "category"
                  ? options.categories
                  : options.collections
                ).map((option) => (
                  <Select.Item key={option.id} value={option.id}>
                    {formatOption(option)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>

          <Field
            label="Sales channel"
            description="Leave as All unless this rule must only run for one storefront publishable-key channel."
          >
            <Select
              value={form.sales_channel_id || "all"}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  sales_channel_id: value === "all" ? "" : value,
                }))
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All sales channels</Select.Item>
                {options.sales_channels.map((option) => (
                  <Select.Item key={option.id} value={option.id}>
                    {formatOption(option)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>

          <Field
            label="Region"
            description="Leave as All for every region, or select Viet Nam when the rule should only apply to /vn carts."
          >
            <Select
              value={form.region_id || "all"}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  region_id: value === "all" ? "" : value,
                }))
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All regions</Select.Item>
                {options.regions.map((option) => (
                  <Select.Item key={option.id} value={option.id}>
                    {formatOption(option)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>

          <div className="md:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAdvanced((current) => !current)}
            >
              {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
            </Button>
          </div>

          {showAdvanced && (
            <>
              <Field label="Start date">
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      starts_at: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="End date">
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ends_at: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field
                label="Priority"
                description="Higher priority wins when rules are not stackable."
              >
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field
                label="Stacking"
                description="Use Do not stack for normal shop combo rules."
              >
                <Select
                  value={form.is_stackable}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      is_stackable: value as "true" | "false",
                    }))
                  }
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="false">Do not stack</Select.Item>
                    <Select.Item value="true">Can stack</Select.Item>
                  </Select.Content>
                </Select>
              </Field>
            </>
          )}
        </div>

        <Field
          label="Customer note"
          description="Use this for short notes such as gifts, freeship, or product exclusions."
        >
          <Textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Displayed internally to explain the combo rule."
          />
        </Field>

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div>
              <Heading level="h2">Discount tiers</Heading>
              <Text className="text-ui-fg-subtle" size="small">
                Use Fixed combo total for bundles like 3 tranh = 290000.
              </Text>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  tiers: [...current.tiers, { ...emptyTier }],
                }))
              }
            >
              Add tier
            </Button>
          </div>

          <div className="grid gap-3">
            {form.tiers.map((tier, index) => (
              <div
                className="grid gap-3 rounded-md border border-ui-border-base p-3 md:grid-cols-[0.7fr_1.2fr_1fr_1fr_0.8fr_0.8fr_auto]"
                key={index}
              >
                <Input
                  type="number"
                  min={1}
                  value={tier.minimum_quantity}
                  onChange={(event) =>
                    setTier(form, setForm, index, {
                      minimum_quantity: event.target.value,
                    })
                  }
                  placeholder="Qty"
                />
                <Select
                  value={tier.discount_type}
                  onValueChange={(value) =>
                    setTier(form, setForm, index, {
                      discount_type: value as DiscountType,
                    })
                  }
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="fixed_total">
                      Fixed combo total
                    </Select.Item>
                    <Select.Item value="percentage">Percent discount</Select.Item>
                    <Select.Item value="fixed">
                      Fixed discount per item
                    </Select.Item>
                  </Select.Content>
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={tier.discount_value}
                  onChange={(event) =>
                    setTier(form, setForm, index, {
                      discount_value: event.target.value,
                    })
                  }
                  placeholder={getTierValuePlaceholder(tier.discount_type)}
                />
                <Input
                  value={tier.label}
                  onChange={(event) =>
                    setTier(form, setForm, index, {
                      label: event.target.value,
                    })
                  }
                  placeholder="Label"
                />
                <Select
                  value={tier.is_featured}
                  onValueChange={(value) =>
                    setTier(form, setForm, index, {
                      is_featured: value as "true" | "false",
                    })
                  }
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="false">Normal</Select.Item>
                    <Select.Item value="true">Highlight</Select.Item>
                  </Select.Content>
                </Select>
                <Select
                  value={tier.is_free_shipping}
                  onValueChange={(value) =>
                    setTier(form, setForm, index, {
                      is_free_shipping: value as "true" | "false",
                    })
                  }
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="false">Normal ship</Select.Item>
                    <Select.Item value="true">Freeship</Select.Item>
                  </Select.Content>
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      tiers: current.tiers.filter((_, i) => i !== index),
                    }))
                  }
                  disabled={form.tiers.length === 1}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSaving}>
            {editingRuleId ? "Update combo rule" : "Save combo rule"}
          </Button>
        </div>
      </form>

      <div className="grid gap-3 p-6">
        <Heading level="h2">Saved combo rules</Heading>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Domain</Table.HeaderCell>
              <Table.HeaderCell>Channel</Table.HeaderCell>
              <Table.HeaderCell>Region</Table.HeaderCell>
              <Table.HeaderCell>Tiers</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rules.length ? (
              rules.map((rule) => (
                <Table.Row key={rule.id}>
                  <Table.Cell>{rule.name}</Table.Cell>
                  <Table.Cell>{formatScope(rule, optionLabels)}</Table.Cell>
                  <Table.Cell>
                    {getLabel(optionLabels.sales_channels, rule.sales_channel_id) ||
                      "All"}
                  </Table.Cell>
                  <Table.Cell>
                    {getLabel(optionLabels.regions, rule.region_id) || "All"}
                  </Table.Cell>
                  <Table.Cell>{formatTiers(rule.tiers)}</Table.Cell>
                  <Table.Cell>
                    <Badge color={rule.status === "active" ? "green" : "grey"}>
                      {rule.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={() => editRule(rule)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={() => toggleRuleStatus(rule)}
                      >
                        {rule.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        variant="danger"
                        onClick={() => deleteRule(rule)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))
            ) : (
              <Table.Row>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle" size="small">
                    No combo rules yet.
                  </Text>
                </Table.Cell>
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <label className="grid gap-2">
      <Text size="small" weight="plus">
        {label}
      </Text>
      {description && (
        <Text size="xsmall" className="text-ui-fg-subtle">
          {description}
        </Text>
      )}
      {children}
    </label>
  )
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${RULES_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

function ruleToForm(rule: ComboRule): ComboRuleForm {
  const scopeType =
    rule.scope_type === "collection" ? "collection" : "category"

  return {
    name: rule.name ?? "",
    description: rule.description ?? "",
    scope_type: scopeType,
    scope_id:
      scopeType === "category"
        ? rule.category_id ?? ""
        : rule.collection_id ?? "",
    sales_channel_id: rule.sales_channel_id ?? "",
    region_id: rule.region_id ?? "",
    tiers: Array.isArray(rule.tiers) && rule.tiers.length
      ? rule.tiers.map((tier) => ({
          minimum_quantity: String(tier.minimum_quantity ?? 1),
          discount_type: tier.discount_type ?? "fixed_total",
          discount_value: String(tier.discount_value ?? 0),
          label: tier.label ?? "",
          is_featured: tier.is_featured ? "true" : "false",
          is_free_shipping: tier.is_free_shipping ? "true" : "false",
        }))
      : [{ ...emptyTier }],
    priority: String(rule.priority ?? 0),
    is_stackable: rule.is_stackable ? "true" : "false",
    starts_at: toDateTimeLocal(rule.starts_at),
    ends_at: toDateTimeLocal(rule.ends_at),
    status: rule.status === "active" ? "active" : "draft",
  }
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)

  return localDate.toISOString().slice(0, 16)
}

function buildPayload(form: ComboRuleForm) {
  return {
    name: form.name.trim(),
    description: optionalString(form.description),
    scope_type: form.scope_type,
    product_id: null,
    category_id:
      form.scope_type === "category" ? optionalString(form.scope_id) : null,
    collection_id:
      form.scope_type === "collection" ? optionalString(form.scope_id) : null,
    option_value_id: null,
    taxonomy_term_id: null,
    sales_channel_id: optionalString(form.sales_channel_id),
    region_id: optionalString(form.region_id),
    tiers: form.tiers
      .map((tier) => ({
        minimum_quantity: Number(tier.minimum_quantity),
        discount_type: tier.discount_type,
        discount_value: Number(tier.discount_value),
        label: optionalString(tier.label),
        is_featured: tier.is_featured === "true",
        is_free_shipping: tier.is_free_shipping === "true",
      }))
      .filter((tier) => {
        if (
          !Number.isInteger(tier.minimum_quantity) ||
          tier.minimum_quantity < 1 ||
          !Number.isFinite(tier.discount_value) ||
          tier.discount_value <= 0
        ) {
          return false
        }

        return tier.discount_type !== "percentage" || tier.discount_value <= 100
      }),
    priority: Number(form.priority || 0),
    is_stackable: form.is_stackable === "true",
    starts_at: optionalString(form.starts_at),
    ends_at: optionalString(form.ends_at),
    status: form.status,
  }
}

function toLabelMap(options: RuleOption[]): Map<string, string> {
  return new Map(options.map((option) => [option.id, option.label]))
}

function getLabel(labels: Map<string, string>, id?: string | null): string {
  if (!id) {
    return ""
  }

  return labels.get(id) ?? id
}

function formatOption(option: RuleOption): string {
  return [option.label, option.subtitle].filter(Boolean).join(" / ")
}

function formatScope(
  rule: Pick<
    ComboRule,
    | "scope_type"
    | "product_id"
    | "category_id"
    | "collection_id"
    | "option_value_id"
    | "taxonomy_term_id"
  >,
  labels: {
    categories: Map<string, string>
    collections: Map<string, string>
  }
): string {
  if (rule.scope_type === "category") {
    return `Category: ${getLabel(labels.categories, rule.category_id)}`
  }

  if (rule.scope_type === "collection") {
    return `Collection: ${getLabel(labels.collections, rule.collection_id)}`
  }

  if (rule.scope_type === "taxonomy") {
    return "Legacy Explore scope"
  }

  return `Legacy scope: ${rule.scope_type}`
}

function formatTiers(tiers: ComboTier[]): string {
  return (Array.isArray(tiers) ? tiers : [])
    .sort((a, b) => a.minimum_quantity - b.minimum_quantity)
    .map((tier) => {
      const value = formatTierValue(tier)
      const featured = tier.is_featured ? " (highlight)" : ""
      const shipping = tier.is_free_shipping ? " + freeship" : ""

      return `${tier.minimum_quantity}+ = ${value}${featured}${shipping}`
    })
    .join(", ")
}

function formatTierValue(tier: ComboTier): string {
  if (tier.discount_type === "percentage") {
    return `${tier.discount_value}% off`
  }

  if (tier.discount_type === "fixed_total") {
    return `${tier.discount_value} total`
  }

  return `${tier.discount_value} off/item`
}

function getTierValuePlaceholder(discountType: DiscountType): string {
  if (discountType === "percentage") {
    return "10"
  }

  if (discountType === "fixed_total") {
    return "290000"
  }

  return "10000"
}

function optionalString(value: string): string | null {
  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

function setTier(
  form: ComboRuleForm,
  setForm: Dispatch<SetStateAction<ComboRuleForm>>,
  index: number,
  patch: Partial<ComboTierForm>
) {
  setForm({
    ...form,
    tiers: form.tiers.map((tier, i) =>
      i === index ? { ...tier, ...patch } : tier
    ),
  })
}

export const config = defineRouteConfig({
  label: "TTV Rules",
  rank: 31,
})

export default TtvRulesPage
