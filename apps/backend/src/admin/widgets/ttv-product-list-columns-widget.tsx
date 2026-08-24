import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

const PAGE_SIZE = 20
const PRODUCT_FIELDS =
  "id,title,thumbnail,status,*categories,*collection,*variants"

type ProductRecord = {
  id: string
  title: string
  thumbnail?: string | null
  status?: string
  categories?: Array<{
    id: string
    name: string
  }>
  collection?: {
    id: string
    title: string
  } | null
  variants?: Array<{
    id: string
  }>
}

type ProductListResponse = {
  products: ProductRecord[]
  count: number
}

const TtvProductListColumnsWidget = () => {
  const prompt = usePrompt()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1)
  const query = searchParams.get("q") ?? ""
  const offset = (page - 1) * PAGE_SIZE
  const [searchValue, setSearchValue] = useState(query)
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [count, setCount] = useState(0)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    setSearchValue(query)
  }, [query])

  const loadProducts = useCallback(async () => {
    setIsLoading(true)

    try {
      const url = new URL("/admin/products", window.location.origin)
      url.searchParams.set("limit", String(PAGE_SIZE))
      url.searchParams.set("offset", String(offset))
      url.searchParams.set("order", "-created_at")
      url.searchParams.set("is_giftcard", "false")
      url.searchParams.set("fields", PRODUCT_FIELDS)

      if (query) {
        url.searchParams.set("q", query)
      }

      const response = await adminFetch<ProductListResponse>(url.toString())
      setProducts(response.products)
      setCount(response.count)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load products"
      )
    } finally {
      setIsLoading(false)
    }
  }, [offset, query])

  useEffect(() => {
    loadProducts()
  }, [loadProducts, refreshToken])

  const selectedProductIdSet = useMemo(
    () => new Set(selectedProductIds),
    [selectedProductIds]
  )
  const currentPageIds = products.map((product) => product.id)
  const selectedCurrentPageCount = currentPageIds.filter((id) =>
    selectedProductIdSet.has(id)
  ).length
  const currentPageSelectionState =
    currentPageIds.length > 0 && selectedCurrentPageCount === currentPageIds.length
      ? true
      : selectedCurrentPageCount > 0
        ? "indeterminate"
        : false
  const totalPages = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    })

    setSearchParams(next)
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParams({ q: searchValue.trim() || null, page: "1" })
  }

  const toggleProduct = (productId: string, checked: boolean) => {
    setSelectedProductIds((current) => {
      const next = new Set(current)

      if (checked) {
        next.add(productId)
      } else {
        next.delete(productId)
      }

      return Array.from(next)
    })
  }

  const toggleCurrentPage = (checked: boolean) => {
    setSelectedProductIds((current) => {
      const next = new Set(current)

      currentPageIds.forEach((productId) => {
        if (checked) {
          next.add(productId)
        } else {
          next.delete(productId)
        }
      })

      return Array.from(next)
    })
  }

  const deleteSelectedProducts = async () => {
    const confirmed = await prompt({
      title: `Delete ${selectedProductIds.length} products?`,
      description:
        "This permanently deletes the selected product albums and their image products. Existing order snapshots are not changed.",
      confirmText: "Delete products",
      cancelText: "Cancel",
      variant: "danger",
    })

    if (!confirmed) {
      return
    }

    setIsDeleting(true)

    try {
      const results = await deleteProductsInBatches(selectedProductIds)
      const failed = results.filter((result) => result.status === "rejected")
      const deletedCount = results.length - failed.length

      if (deletedCount) {
        toast.success(`${deletedCount} product(s) deleted`)
      }

      if (failed.length) {
        toast.error(`${failed.length} product(s) could not be deleted`)
      }

      setSelectedProductIds(
        selectedProductIds.filter(
          (_, index) => results[index]?.status === "rejected"
        )
      )
      setRefreshToken((current) => current + 1)
    } finally {
      setIsDeleting(false)
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
        <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Heading level="h1">Products</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              Each Product is an album. Categories and collections come from Medusa.
            </Text>
          </div>
          <Button size="small" variant="secondary" asChild>
            <Link to="create">Create</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
          <form
            className="flex w-full max-w-md items-center gap-2"
            onSubmit={handleSearch}
          >
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
            {count
              ? `${offset + 1}-${Math.min(offset + PAGE_SIZE, count)} of ${count}`
              : "0 products"}
          </Text>
        </div>

        {selectedProductIds.length ? (
          <div className="flex flex-col gap-3 bg-ui-bg-subtle px-6 py-3 md:flex-row md:items-center md:justify-between">
            <Text size="small" weight="plus">
              {selectedProductIds.length} product(s) selected
            </Text>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="small"
                variant="secondary"
                disabled={isDeleting}
                onClick={() => setSelectedProductIds([])}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="small"
                variant="danger"
                isLoading={isDeleting}
                onClick={deleteSelectedProducts}
              >
                Delete selected
              </Button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-12">
                  <Checkbox
                    aria-label="Select products on this page"
                    checked={currentPageSelectionState}
                    disabled={!products.length || isLoading}
                    onCheckedChange={(checked) =>
                      toggleCurrentPage(checked === true)
                    }
                  />
                </Table.HeaderCell>
                <Table.HeaderCell>Product album</Table.HeaderCell>
                <Table.HeaderCell>Categories</Table.HeaderCell>
                <Table.HeaderCell>Collection</Table.HeaderCell>
                <Table.HeaderCell>Images / variants</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {products.map((product) => (
                <Table.Row key={product.id}>
                  <Table.Cell>
                    <Checkbox
                      aria-label={`Select ${product.title}`}
                      checked={selectedProductIdSet.has(product.id)}
                      onCheckedChange={(checked) =>
                        toggleProduct(product.id, checked === true)
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Link
                      className="flex max-w-[300px] items-center gap-3 overflow-hidden"
                      to={product.id}
                    >
                      <ProductThumbnail product={product} />
                      <span className="truncate text-ui-fg-base">
                        {product.title}
                      </span>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <StackedValues
                      values={(product.categories ?? []).map(
                        (category) => category.name
                      )}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <StackedValues
                      values={product.collection ? [product.collection.title] : []}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Text className="text-ui-fg-subtle" size="small">
                      {product.variants?.length ?? 0} internal variant(s)
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <ProductStatusBadge status={product.status} />
                  </Table.Cell>
                </Table.Row>
              ))}

              {!isLoading && !products.length ? (
                <Table.Row>
                  <Table.Cell />
                  <Table.Cell>
                    <Text className="text-ui-fg-muted" size="small">
                      No products found
                    </Text>
                  </Table.Cell>
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

  return visibleValues.length ? (
    <span className="text-small-regular text-ui-fg-subtle">
      {visibleValues.join(", ")}
    </span>
  ) : (
    <span className="text-small-regular text-ui-fg-muted">-</span>
  )
}

function ProductStatusBadge({ status }: { status?: string }) {
  const color = status === "published" ? "green" : "grey"

  return <Badge color={color}>{status ?? "draft"}</Badge>
}

async function deleteProductsInBatches(productIds: string[]) {
  const results: PromiseSettledResult<unknown>[] = []

  for (let index = 0; index < productIds.length; index += 10) {
    const batch = productIds.slice(index, index + 10)
    results.push(
      ...(await Promise.allSettled(
        batch.map((productId) =>
          adminFetch(`/admin/products/${encodeURIComponent(productId)}`, {
            method: "DELETE",
          })
        )
      ))
    )
  }

  return results
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
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const config = defineWidgetConfig({
  zone: "product.list",
  id: "ttv-product-list-columns",
})

export default TtvProductListColumnsWidget
