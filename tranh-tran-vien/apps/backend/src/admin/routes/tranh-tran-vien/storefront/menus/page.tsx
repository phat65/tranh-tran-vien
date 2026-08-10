// Trang admin quản lý menu Explore, gồm 5 nhóm cha, link con và ảnh upload qua Medusa.

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
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react"

type NavigationMenu = {
  id: string
  code: string
  name: string
  status: "draft" | "active" | "archived"
}

type NavigationItem = {
  id: string
  menu_id: string
  parent_id?: string | null
  label: string
  link_type: "url" | "product" | "category" | "brand" | "taxonomy" | "page" | "post"
  entity_id?: string | null
  url?: string | null
  image_url?: string | null
  sort_order: number
  visibility: "visible" | "hidden"
}

type ItemForm = {
  parent_id: string
  label: string
  url: string
  image_url: string
  sort_order: string
  visibility: "visible" | "hidden"
}

const MENUS_API = "/admin/tranh-tran-vien/catalog/navigation-menus"
const ITEMS_API = "/admin/tranh-tran-vien/catalog/navigation-items"
const EXPLORE_CODE = "explore"
const ROOT_VALUE = "__root__"

const defaultHeadings = [
  "Shop by Shape",
  "Shop by Category",
  "Popular Anime",
  "Popular Games",
  "Shop Extras",
]

const defaultForm: ItemForm = {
  parent_id: ROOT_VALUE,
  label: "",
  url: "",
  image_url: "",
  sort_order: "0",
  visibility: "visible",
}

const TtvStorefrontMenusPage = () => {
  const [menu, setMenu] = useState<NavigationMenu | null>(null)
  const [items, setItems] = useState<NavigationItem[]>([])
  const [form, setForm] = useState<ItemForm>(defaultForm)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const parentItems = useMemo(
    () =>
      items
        .filter((item) => !item.parent_id)
        .sort((first, second) => first.sort_order - second.sort_order),
    [items]
  )

  const childItemsByParent = useMemo(() => {
    const groups = new Map<string, NavigationItem[]>()

    items
      .filter((item) => item.parent_id)
      .sort((first, second) => first.sort_order - second.sort_order)
      .forEach((item) => {
        if (!item.parent_id) {
          return
        }

        groups.set(item.parent_id, [...(groups.get(item.parent_id) ?? []), item])
      })

    return groups
  }, [items])

  const loadExploreMenu = async () => {
    setIsLoading(true)

    try {
      const response = await adminFetch<{
        navigation_menus: NavigationMenu[]
      }>(`${MENUS_API}?limit=200`)
      const existingMenu =
        response.navigation_menus.find((item) => item.code === EXPLORE_CODE) ??
        null
      const activeMenu =
        existingMenu ??
        (
          await adminFetch<{ navigation_menu: NavigationMenu }>(MENUS_API, {
            method: "POST",
            body: JSON.stringify({
              code: EXPLORE_CODE,
              name: "Explore",
              status: "active",
            }),
          })
        ).navigation_menu

      setMenu(activeMenu)
      await loadItems(activeMenu.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load menu")
    } finally {
      setIsLoading(false)
    }
  }

  const loadItems = async (menuId: string) => {
    const response = await adminFetch<{
      navigation_items: NavigationItem[]
    }>(`${ITEMS_API}?menu_id=${encodeURIComponent(menuId)}&limit=200`)

    setItems(response.navigation_items)
  }

  const saveItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!menu) {
      return
    }

    if (!form.label.trim()) {
      toast.error("Label is required")
      return
    }

    setIsSaving(true)

    try {
      await adminFetch<{ navigation_item: NavigationItem }>(ITEMS_API, {
        method: "POST",
        body: JSON.stringify({
          menu_id: menu.id,
          parent_id: form.parent_id === ROOT_VALUE ? null : form.parent_id,
          label: form.label.trim(),
          link_type: "url",
          url: form.url.trim() || null,
          image_url: form.image_url.trim() || null,
          sort_order: Number(form.sort_order || 0),
          visibility: form.visibility,
        }),
      })

      setForm(defaultForm)
      await loadItems(menu.id)
      toast.success("Menu item created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save item")
    } finally {
      setIsSaving(false)
    }
  }

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsUploading(true)

    try {
      const data = new FormData()
      data.append("files", file)

      const response = await fetch("/admin/uploads?fields=id,url", {
        method: "POST",
        body: data,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Upload failed with status ${response.status}`)
      }

      const result = (await response.json()) as {
        files?: { id: string; url: string }[]
      }
      const uploadedUrl = result.files?.[0]?.url

      if (!uploadedUrl) {
        throw new Error("Upload did not return an image URL")
      }

      setForm((current) => ({ ...current, image_url: uploadedUrl }))
      toast.success("Image uploaded")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image")
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  const seedHeadings = async () => {
    if (!menu) {
      return
    }

    setIsSaving(true)

    try {
      const existingLabels = new Set(
        parentItems.map((item) => item.label.trim().toLowerCase())
      )
      const missingHeadings = defaultHeadings.filter(
        (label) => !existingLabels.has(label.toLowerCase())
      )

      await Promise.all(
        missingHeadings.map((label, index) =>
          adminFetch<{ navigation_item: NavigationItem }>(ITEMS_API, {
            method: "POST",
            body: JSON.stringify({
              menu_id: menu.id,
              parent_id: null,
              label,
              link_type: "url",
              url: null,
              sort_order: (parentItems.length + index + 1) * 10,
              visibility: "visible",
            }),
          })
        )
      )

      await loadItems(menu.id)
      toast.success("Explore headings ready")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create headings"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!menu) {
      return
    }

    try {
      await adminFetch(`${ITEMS_API}/${itemId}`, { method: "DELETE" })
      await loadItems(menu.id)
      toast.success("Menu item deleted")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete menu item"
      )
    }
  }

  useEffect(() => {
    loadExploreMenu()
  }, [])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Explore menu</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage the five-column Explore dropdown shown in the storefront nav.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={seedHeadings}
            isLoading={isSaving}
            disabled={!menu}
          >
            Seed 5 headings
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={loadExploreMenu}
            isLoading={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[360px_1fr]">
        <form className="grid content-start gap-4" onSubmit={saveItem}>
          <Heading level="h2">Add item</Heading>
          <Field label="Parent">
            <Select
              value={form.parent_id}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, parent_id: value }))
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value={ROOT_VALUE}>Top-level heading</Select.Item>
                {parentItems.map((item) => (
                  <Select.Item key={item.id} value={item.id}>
                    {item.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>
          <Field label="Label">
            <Input
              value={form.label}
              onChange={(event) =>
                setForm((current) => ({ ...current, label: event.target.value }))
              }
              placeholder="Demon Slayer"
            />
          </Field>
          <Field label="URL">
            <Input
              value={form.url}
              onChange={(event) =>
                setForm((current) => ({ ...current, url: event.target.value }))
              }
              placeholder="/collections/demon-slayer"
            />
          </Field>
          <Field label="Image">
            <Input type="file" accept="image/*" onChange={uploadImage} />
          </Field>
          <Field label="Image URL">
            <Input
              value={form.image_url}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  image_url: event.target.value,
                }))
              }
              placeholder="Uploaded image URL"
              disabled={isUploading}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
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
                value={form.visibility}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    visibility: value === "hidden" ? "hidden" : "visible",
                  }))
                }
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="visible">Visible</Select.Item>
                  <Select.Item value="hidden">Hidden</Select.Item>
                </Select.Content>
              </Select>
            </Field>
          </div>
          <Button type="submit" isLoading={isSaving || isUploading}>
            Create item
          </Button>
        </form>

        <div className="grid content-start gap-4">
          <Heading level="h2">Current Explore structure</Heading>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {parentItems.map((parent) => (
              <div
                key={parent.id}
                className="grid content-start gap-3 border border-ui-border-base p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Text size="small" weight="plus">
                      {parent.label}
                    </Text>
                    <Text className="text-ui-fg-subtle" size="xsmall">
                      Sort {parent.sort_order}
                    </Text>
                  </div>
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={() => deleteItem(parent.id)}
                  >
                    Delete
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(childItemsByParent.get(parent.id) ?? []).map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between gap-3 rounded-rounded bg-ui-bg-subtle px-3 py-2"
                    >
                      <div className="min-w-0">
                        <Text className="truncate" size="small">
                          {child.label}
                        </Text>
                        <Text className="truncate text-ui-fg-subtle" size="xsmall">
                          {child.url || child.image_url || "No URL"}
                        </Text>
                      </div>
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={() => deleteItem(child.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
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
    <label className="grid gap-1">
      <Text size="small" weight="plus">
        {label}
      </Text>
      {children}
    </label>
  )
}

async function adminFetch<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const config = defineRouteConfig({
  label: "TTV Explore Menu",
  rank: 32,
})

export default TtvStorefrontMenusPage
