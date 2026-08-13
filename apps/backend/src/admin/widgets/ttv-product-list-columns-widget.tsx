import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Link, useSearchParams } from "react-router-dom"

const PAGE_SIZE = 20
const PRODUCT_FIELDS =
  "id,title,thumbnail,status,*collection,*sales_channels,*variants"
const EXPLORE_API = "/admin/tranh-tran-vien/catalog/explore"
const PRODUCT_IMAGE_UPLOAD_API =
  "/admin/tranh-tran-vien/catalog/explore/product-images"

type ProductRecord = {
  id: string
  title: string
  thumbnail?: string | null
  status?: "draft" | "proposed" | "published" | "rejected" | string
  collection?: {
    id: string
    title: string
  } | null
  sales_channels?: Array<{
    id: string
    name: string
  } | null>
  variants?: Array<{
    id: string
  }>
}

type ProductListResponse = {
  products: ProductRecord[]
  count: number
}

type ExploreTerm = {
  id: string
  name: string
}

type ExploreGroup = {
  code: string
  label: string
  terms: ExploreTerm[]
}

type ExploreResponse = {
  groups: ExploreGroup[]
  selected_term_ids_by_product_id?: Record<string, string[]>
  filtered_product_ids?: string[]
}

type ProductExploreSummary = {
  headings: string[]
  items: string[]
}

type ProductImageUploadResponse = {
  product_title: string
  uploaded_count: number
  failed_count: number
  failed?: Array<{
    filename: string
    message: string
  }>
}

const TtvProductListColumnsWidget = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1)
  const query = searchParams.get("q") ?? ""
  const order = searchParams.get("order") ?? "-created_at"
  const exploreHeading = searchParams.get("explore_heading") ?? ""
  const exploreItem = searchParams.get("explore_item") ?? ""
  const offset = (page - 1) * PAGE_SIZE

  const [products, setProducts] = useState<ProductRecord[]>([])
  const [count, setCount] = useState(0)
  const [groups, setGroups] = useState<ExploreGroup[]>([])
  const [selectedTermIdsByProductId, setSelectedTermIdsByProductId] = useState<
    Record<string, string[]>
  >({})
  const [searchValue, setSearchValue] = useState(query)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    setSearchValue(query)
  }, [query])

  useEffect(() => {
    let isCurrent = true

    const loadProducts = async () => {
      setIsLoading(true)

      try {
        const groupsResponse = await loadExploreForProducts([])
        const filterTermIds = getExploreFilterTermIds(
          groupsResponse.groups,
          exploreHeading,
          exploreItem
        )
        let filteredProductIds: string[] | undefined

        if (filterTermIds.length) {
          filteredProductIds = await loadProductIdsForExploreTerms(filterTermIds)

          if (!filteredProductIds.length) {
            if (!isCurrent) {
              return
            }

            setProducts([])
            setCount(0)
            setGroups(groupsResponse.groups)
            setSelectedTermIdsByProductId({})
            return
          }
        }

        const productsUrl = new URL("/admin/products", window.location.origin)
        productsUrl.searchParams.set("limit", String(PAGE_SIZE))
        productsUrl.searchParams.set("offset", String(offset))
        productsUrl.searchParams.set("is_giftcard", "false")
        productsUrl.searchParams.set("fields", PRODUCT_FIELDS)
        filteredProductIds?.forEach((productId) => {
          productsUrl.searchParams.append("id", productId)
        })

        if (query) {
          productsUrl.searchParams.set("q", query)
        }

        if (order) {
          productsUrl.searchParams.set("order", order)
        }

        const productResponse = await adminFetch<ProductListResponse>(
          productsUrl.toString()
        )
        const productIds = productResponse.products.map((product) => product.id)
        const exploreResponse = await loadExploreForProducts(productIds)

        if (!isCurrent) {
          return
        }

        setProducts(productResponse.products)
        setCount(productResponse.count)
        setGroups(exploreResponse.groups.length ? exploreResponse.groups : groupsResponse.groups)
        setSelectedTermIdsByProductId(
          exploreResponse.selected_term_ids_by_product_id ?? {}
        )
      } catch (error) {
        if (isCurrent) {
          toast.error(
            error instanceof Error ? error.message : "Could not load products"
          )
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      isCurrent = false
    }
  }, [exploreHeading, exploreItem, offset, order, query, refreshToken])

  const rows = useMemo(
    () =>
      products.map((product) => ({
        product,
        explore: summarizeProductExplore(
          groups,
          selectedTermIdsByProductId[product.id] ?? []
        ),
      })),
    [groups, products, selectedTermIdsByProductId]
  )

  const totalPages = Math.max(Math.ceil(count / PAGE_SIZE), 1)
  const selectedExploreGroup = groups.find(
    (group) => group.code === exploreHeading
  )

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    })

    setSearchParams(next)
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParams({
      q: searchValue.trim() || null,
      page: "1",
    })
  }

  const handleUploadClick = () => {
    if (!exploreItem) {
      toast.error("Please select an Explore Item before uploading images.")
      return
    }

    uploadInputRef.current?.click()
  }

  const uploadProductImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""

    if (!files.length) {
      return
    }

    if (!exploreItem) {
      toast.error("Please select an Explore Item before uploading images.")
      return
    }

    setIsUploadingImages(true)

    try {
      const uploadFiles = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          mime_type: file.type,
          content: await fileToBase64(file),
        }))
      )

      const response = await fetch(PRODUCT_IMAGE_UPLOAD_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          term_id: exploreItem,
          explore_heading: exploreHeading,
          files: uploadFiles,
        }),
      })

      if (!response.ok) {
        throw new Error(await getUploadErrorMessage(response))
      }

      const result = (await response.json()) as ProductImageUploadResponse

      if (result.uploaded_count) {
        if (result.failed_count) {
          toast.success(
            `${result.uploaded_count} images uploaded, ${result.failed_count} failed.`
          )
        } else {
          toast.success(
            `${result.uploaded_count} images uploaded to ${result.product_title}.`
          )
        }
      }

      if (result.failed?.length) {
        toast.error(formatUploadFailures(result.failed))
      }

      setRefreshToken((current) => current + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload images")
    } finally {
      setIsUploadingImages(false)
    }
  }

  return (
    <div data-ttv-product-list-replacement="true">
      <style>
        {`
          @supports selector(:has(*)) {
            .flex.flex-col.gap-y-3:has(> [data-ttv-product-list-replacement="true"]) > :not([data-ttv-product-list-replacement="true"]) {
              display: none !important;
            }
          }
        `}
      </style>

      <Container className="divide-y p-0">
        <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Heading level="h1">Products</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              Product list with Explore Heading and Explore Item assignments.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={uploadInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={uploadProductImages}
              disabled={!exploreItem || isUploadingImages}
            />
            <Button
              size="small"
              variant="secondary"
              type="button"
              disabled={!exploreItem || isUploadingImages}
              onClick={handleUploadClick}
            >
              {isUploadingImages ? "Uploading..." : "Upload"}
            </Button>
            <Button size="small" variant="secondary" asChild>
              <Link to="create">Create</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
          <form className="flex w-full max-w-md items-center gap-2" onSubmit={handleSearch}>
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search products"
            />
            <Button size="small" variant="secondary" type="submit">
              Search
            </Button>
          </form>

          <Text className="text-ui-fg-subtle" size="small">
            {count ? `${offset + 1}-${Math.min(offset + PAGE_SIZE, count)} of ${count}` : "0 products"}
          </Text>
        </div>

        <div className="grid gap-3 px-6 py-3 md:grid-cols-[minmax(0,16rem)_minmax(0,16rem)_auto] md:items-end">
          <label className="grid gap-1 text-small-regular text-ui-fg-subtle">
            <span>Explore Heading</span>
            <select
              className="h-10 rounded-rounded border border-ui-border-base bg-ui-bg-base px-3 text-ui-fg-base"
              value={exploreHeading}
              onChange={(event) =>
                updateParams({
                  explore_heading: event.target.value || null,
                  explore_item: null,
                  page: "1",
                })
              }
            >
              <option value="">All headings</option>
              {groups.map((group) => (
                <option key={group.code} value={group.code}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-small-regular text-ui-fg-subtle">
            <span>Explore Item</span>
            <select
              className="h-10 rounded-rounded border border-ui-border-base bg-ui-bg-base px-3 text-ui-fg-base"
              value={exploreItem}
              disabled={!selectedExploreGroup}
              onChange={(event) =>
                updateParams({
                  explore_item: event.target.value || null,
                  page: "1",
                })
              }
            >
              <option value="">All items</option>
              {(selectedExploreGroup?.terms ?? []).map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            size="small"
            variant="secondary"
            disabled={!exploreHeading && !exploreItem}
            onClick={() =>
              updateParams({
                explore_heading: null,
                explore_item: null,
                page: "1",
              })
            }
          >
            Clear Explore filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[1080px]">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Explore Heading</Table.HeaderCell>
                <Table.HeaderCell>Explore Item</Table.HeaderCell>
                <Table.HeaderCell>Collection</Table.HeaderCell>
                <Table.HeaderCell>Sales Channels</Table.HeaderCell>
                <Table.HeaderCell>Variants</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map(({ product, explore }) => (
                <Table.Row key={product.id}>
                  <Table.Cell>
                    <Link
                      className="flex max-w-[260px] items-center gap-3 overflow-hidden"
                      to={product.id}
                    >
                      <ProductThumbnail product={product} />
                      <span className="truncate text-ui-fg-base">
                        {product.title}
                      </span>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <StackedValues values={explore.headings} />
                  </Table.Cell>
                  <Table.Cell>
                    <StackedValues values={explore.items} />
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-small-regular text-ui-fg-subtle">
                      {product.collection?.title ?? "-"}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <StackedValues
                      values={(product.sales_channels ?? [])
                        .filter(Boolean)
                        .map((channel) => channel?.name ?? "")}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-small-regular text-ui-fg-subtle">
                      {product.variants?.length ?? 0}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <ProductStatusBadge status={product.status} />
                  </Table.Cell>
                </Table.Row>
              ))}

              {!isLoading && !rows.length ? (
                <Table.Row>
                  <Table.Cell>
                    <Text className="text-ui-fg-muted" size="small">
                      No products found
                    </Text>
                  </Table.Cell>
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                </Table.Row>
              ) : null}

              {isLoading ? (
                <Table.Row>
                  <Table.Cell>
                    <Text className="text-ui-fg-muted" size="small">
                      Loading products...
                    </Text>
                  </Table.Cell>
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                </Table.Row>
              ) : null}
            </Table.Body>
          </Table>
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <Text className="text-ui-fg-subtle" size="small">
            Page {page} of {totalPages}
          </Text>
          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant="secondary"
              disabled={page <= 1 || isLoading}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="secondary"
              disabled={page >= totalPages || isLoading}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      </Container>
    </div>
  )
}

function ProductThumbnail({ product }: { product: ProductRecord }) {
  if (product.thumbnail) {
    return (
      <img
        alt=""
        className="h-10 w-10 flex-shrink-0 rounded-rounded border border-ui-border-base object-cover"
        src={product.thumbnail}
      />
    )
  }

  return (
    <div className="h-10 w-10 flex-shrink-0 rounded-rounded border border-ui-border-base bg-ui-bg-subtle" />
  )
}

function StackedValues({ values }: { values: string[] }) {
  const visibleValues = values.filter(Boolean)

  if (!visibleValues.length) {
    return <span className="text-small-regular text-ui-fg-muted">-</span>
  }

  return (
    <div className="grid max-w-[220px] gap-1">
      {visibleValues.map((value) => (
        <span
          className="truncate text-small-regular text-ui-fg-subtle"
          key={value}
          title={value}
        >
          {value}
        </span>
      ))}
    </div>
  )
}

function ProductStatusBadge({ status }: { status?: string }) {
  const statusDisplay = {
    draft: ["grey", "Draft"],
    proposed: ["orange", "Proposed"],
    published: ["green", "Published"],
    rejected: ["red", "Rejected"],
  }[status ?? ""] as
    | ["grey" | "orange" | "green" | "red", string]
    | undefined

  if (!statusDisplay) {
    return <Badge color="grey">{status ?? "-"}</Badge>
  }

  return <Badge color={statusDisplay[0]}>{statusDisplay[1]}</Badge>
}

function summarizeProductExplore(
  groups: ExploreGroup[],
  selectedTermIds: string[]
): ProductExploreSummary {
  const selected = new Set(selectedTermIds)
  const headings: string[] = []
  const items: string[] = []

  groups.forEach((group) => {
    const matchingTerms = group.terms.filter((term) => selected.has(term.id))

    if (!matchingTerms.length) {
      return
    }

    headings.push(group.label)
    items.push(...matchingTerms.map((term) => term.name))
  })

  return { headings, items }
}

function getExploreFilterTermIds(
  groups: ExploreGroup[],
  headingCode: string,
  itemId: string
) {
  const group = groups.find((candidate) => candidate.code === headingCode)

  if (itemId && group?.terms.some((term) => term.id === itemId)) {
    return [itemId]
  }

  if (group) {
    return group.terms.map((term) => term.id)
  }

  return []
}

async function loadExploreForProducts(
  productIds: string[]
): Promise<ExploreResponse> {
  const exploreUrl = new URL(EXPLORE_API, window.location.origin)

  if (productIds.length) {
    exploreUrl.searchParams.set("product_ids", productIds.join(","))
  }

  return adminFetch<ExploreResponse>(exploreUrl.toString())
}

async function loadProductIdsForExploreTerms(termIds: string[]) {
  const exploreUrl = new URL(EXPLORE_API, window.location.origin)
  exploreUrl.searchParams.set("term_ids", termIds.join(","))

  const response = await adminFetch<ExploreResponse>(exploreUrl.toString())

  return response.filtered_product_ids ?? []
}

async function getUploadErrorMessage(response: Response) {
  const text = await response.text()

  if (!text) {
    return `Upload failed with status ${response.status}`
  }

  try {
    const payload = JSON.parse(text) as { message?: unknown }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message
    }
  } catch {
    return text
  }

  return text
}

function formatUploadFailures(
  failed: NonNullable<ProductImageUploadResponse["failed"]>
) {
  return failed
    .map((failure) => `${failure.filename}: ${failure.message}`)
    .join("\n")
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  let binary = ""
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return window.btoa(binary)
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

export const config = defineWidgetConfig({
  zone: "product.list",
  id: "ttv-product-list-columns",
})

export default TtvProductListColumnsWidget
