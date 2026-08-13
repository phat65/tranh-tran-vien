import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"

type ExploreTerm = {
  id: string
  taxonomy_id: string
  name: string
  slug: string
  status: "draft" | "active" | "archived"
  sort_order: number
  metadata?: Record<string, unknown> | null
}

type ExploreGroup = {
  code: string
  label: string
  slug: string
  sort_order: number
  taxonomy_id?: string | null
  terms: ExploreTerm[]
}

type ExploreResponse = {
  groups: ExploreGroup[]
}

type ItemForm = {
  group_code: string
  name: string
  slug: string
  sort_order: string
  status: "draft" | "active" | "archived"
}

const EXPLORE_API = "/admin/tranh-tran-vien/catalog/explore"
const TERMS_API = "/admin/tranh-tran-vien/catalog/taxonomy-terms"

const defaultForm: ItemForm = {
  group_code: "",
  name: "",
  slug: "",
  sort_order: "10",
  status: "active",
}

const ExploreItemsPage = () => {
  const [groups, setGroups] = useState<ExploreGroup[]>([])
  const [form, setForm] = useState<ItemForm>(defaultForm)
  const [editingTermId, setEditingTermId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const selectedGroup = useMemo(
    () => groups.find((group) => group.code === form.group_code) ?? groups[0],
    [form.group_code, groups]
  )

  const loadExplore = async () => {
    setIsLoading(true)

    try {
      const response = await adminFetch<ExploreResponse>(EXPLORE_API)

      setGroups(response.groups)
      setForm((current) => ({
        ...current,
        group_code: current.group_code || response.groups[0]?.code || "",
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load Explore")
    } finally {
      setIsLoading(false)
    }
  }

  const saveItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedGroup?.taxonomy_id) {
      toast.error("Choose one of the fixed headings")
      return
    }

    const name = form.name.trim()
    const publicSlug = slugify(form.slug || name)

    if (!name || !publicSlug) {
      toast.error("Item name and slug are required")
      return
    }

    setIsSaving(true)

    try {
      const existingTerm = groups
        .flatMap((group) => group.terms)
        .find((term) => term.id === editingTermId)
      const payload = {
        taxonomy_id: selectedGroup.taxonomy_id,
        name,
        slug: toStorageSlug(selectedGroup.slug, publicSlug),
        status: form.status,
        sort_order: Number(form.sort_order || 0),
        metadata: {
          ...(existingTerm?.metadata ?? {}),
          source: "explore",
          slug: publicSlug,
        },
      }
      const endpoint = editingTermId ? `${TERMS_API}/${editingTermId}` : TERMS_API

      await adminFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      resetForm(selectedGroup.code)
      await loadExplore()
      toast.success(editingTermId ? "Explore item updated" : "Explore item created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save item")
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (group: ExploreGroup, term: ExploreTerm) => {
    setEditingTermId(term.id)
    setForm({
      group_code: group.code,
      name: term.name,
      slug: getPublicTermSlug(term),
      sort_order: String(term.sort_order),
      status: term.status,
    })
  }

  const deleteItem = async (term: ExploreTerm) => {
    setIsSaving(true)

    try {
      await adminFetch(`${TERMS_API}/${term.id}`, { method: "DELETE" })
      await loadExplore()
      toast.success("Explore item deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete item")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = (groupCode = form.group_code) => {
    setEditingTermId(null)
    setForm({
      ...defaultForm,
      group_code: groupCode,
    })
  }

  useEffect(() => {
    loadExplore()
  }, [])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Explore items</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage child items under the five fixed Explore headings.
          </Text>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={loadExplore}
          isLoading={isLoading}
        >
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 p-6">
        <div className="overflow-hidden rounded-rounded border border-ui-border-base">
          <div className="grid grid-cols-[minmax(220px,1fr)_minmax(360px,2fr)] border-b border-ui-border-base px-4 py-3">
            <Text size="small" weight="plus">
              Fixed heading
            </Text>
            <Text size="small" weight="plus">
              Items
            </Text>
          </div>
          {groups.map((group) => (
            <div
              key={group.code}
              className="grid grid-cols-[minmax(220px,1fr)_minmax(360px,2fr)] gap-4 border-b border-ui-border-base px-4 py-3 last:border-b-0"
            >
              <div>
                <Text size="small" weight="plus">
                  {group.label}
                </Text>
                <Text className="text-ui-fg-subtle" size="xsmall">
                  Fixed heading
                </Text>
              </div>
              <div className="grid gap-2">
                {group.terms.length ? (
                  group.terms.map((term) => (
                    <div
                      key={term.id}
                      className="grid grid-cols-[1fr_90px_90px_150px] items-center gap-3 rounded-rounded bg-ui-bg-subtle px-3 py-2"
                    >
                      <div className="min-w-0">
                        <Text className="truncate" size="small">
                          {term.name}
                        </Text>
                        <Text className="truncate text-ui-fg-subtle" size="xsmall">
                          /explore/{group.slug}/{getPublicTermSlug(term)}
                        </Text>
                      </div>
                      <Text className="text-ui-fg-subtle" size="small">
                        {term.sort_order}
                      </Text>
                      <Text className="text-ui-fg-subtle" size="small">
                        {term.status === "active" ? "Visible" : "Hidden"}
                      </Text>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="small"
                          variant="secondary"
                          onClick={() => startEdit(group, term)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="small"
                          variant="secondary"
                          onClick={() => deleteItem(term)}
                          isLoading={isSaving}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <Text className="text-ui-fg-subtle" size="small">
                    No items yet
                  </Text>
                )}
              </div>
            </div>
          ))}
        </div>

        <form
          className="grid gap-4 rounded-rounded border border-ui-border-base p-4 md:grid-cols-2"
          onSubmit={saveItem}
        >
          <div className="md:col-span-2">
            <Heading level="h2">
              {editingTermId ? "Edit Explore item" : "Create Explore item"}
            </Heading>
          </div>
          <Field label="Heading">
            <Select
              value={form.group_code || groups[0]?.code}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, group_code: value }))
              }
            >
              <Select.Trigger>
                <Select.Value />
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
          <Field label="Item name">
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                  slug: current.slug || slugify(event.target.value),
                }))
              }
              placeholder="Zenitsu"
            />
          </Field>
          <Field label="Slug">
            <Input
              value={form.slug}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  slug: slugify(event.target.value),
                }))
              }
              placeholder="zenitsu"
            />
          </Field>
          <Field label="Sort order">
            <Input
              type="number"
              value={form.sort_order}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sort_order: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Visibility">
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  status: value === "active" ? "active" : "draft",
                }))
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="active">Visible</Select.Item>
                <Select.Item value="draft">Hidden</Select.Item>
              </Select.Content>
            </Select>
          </Field>
          <div className="flex items-center gap-2 md:col-span-2">
            <Button type="submit" isLoading={isSaving}>
              {editingTermId ? "Update item" : "Create item"}
            </Button>
            {editingTermId ? (
              <Button type="button" variant="secondary" onClick={() => resetForm()}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </Container>
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

function getPublicTermSlug(term: ExploreTerm) {
  const metadataSlug = term.metadata?.slug

  return typeof metadataSlug === "string" && metadataSlug.trim()
    ? metadataSlug.trim()
    : term.slug
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toStorageSlug(groupSlug: string, publicSlug: string) {
  return `${groupSlug}-${publicSlug}`
}

async function adminFetch<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const config = defineRouteConfig({
  label: "Explore items",
  rank: 31,
})

export default ExploreItemsPage
