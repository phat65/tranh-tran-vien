import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listTtvComboRules, TtvComboRule } from "@lib/data/ttv"
import ProductPreview from "@modules/products/components/product-preview"
import { Heading, Text } from "@modules/common/components/ui"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ countryCode: string }>
}

export const metadata = {
  title: "Combo",
  description: "Active product combo offers",
}

export default async function ComboPage({ params }: Props) {
  const { countryCode } = await params
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  const rules = await listTtvComboRules({ regionId: region.id })

  return (
    <div className="content-container py-10 small:py-16">
      <div className="mb-8 grid gap-2">
        <Heading level="h1">Combo</Heading>
        <Text className="text-ui-fg-subtle">
          Choose products from an active combo group. The cart will count
          eligible items toward the configured combo tiers.
        </Text>
      </div>

      {rules.length ? (
        <div className="grid gap-12">
          {rules.map((rule) => (
            <ComboRuleSection
              key={rule.id}
              rule={rule}
              countryCode={countryCode}
              region={region}
            />
          ))}
        </div>
      ) : (
        <div className="border-y border-ui-border-base py-10">
          <Text className="text-ui-fg-subtle">
            No active combo rules are available for this region.
          </Text>
        </div>
      )}
    </div>
  )
}

async function ComboRuleSection({
  rule,
  countryCode,
  region,
}: {
  rule: TtvComboRule
  countryCode: string
  region: NonNullable<Awaited<ReturnType<typeof getRegion>>>
}) {
  const products = await listComboProducts(rule, countryCode)

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-2 border-b border-ui-border-base pb-4 small:flex-row small:items-end small:justify-between">
        <div className="grid gap-1">
          <Heading level="h2">{rule.name}</Heading>
          {rule.description && (
            <Text className="text-ui-fg-subtle">{rule.description}</Text>
          )}
          <Text className="txt-small text-ui-fg-subtle">
            {formatRuleScope(rule)}
          </Text>
        </div>
        <Text className="txt-compact-medium-plus">
          {formatTiers(rule, region.currency_code)}
        </Text>
      </div>

      {products.length ? (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 small:grid-cols-3 medium:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductPreview product={product} region={region} />
            </li>
          ))}
        </ul>
      ) : (
        <Text className="text-ui-fg-subtle">
          No storefront products currently match this combo rule.
        </Text>
      )}
    </section>
  )
}

async function listComboProducts(rule: TtvComboRule, countryCode: string) {
  const queryParams = buildProductQuery(rule)

  if (!queryParams) {
    return []
  }

  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams,
  })

  return products
}

function buildProductQuery(rule: TtvComboRule) {
  const base = {
    limit: 24,
  }

  if (rule.scope_type === "all") {
    return base
  }

  if (rule.scope_type === "product" && rule.product_id) {
    return {
      ...base,
      id: [rule.product_id],
    }
  }

  if (rule.scope_type === "category" && rule.category_id) {
    return {
      ...base,
      category_id: [rule.category_id],
    }
  }

  if (rule.scope_type === "collection" && rule.collection_id) {
    return {
      ...base,
      collection_id: [rule.collection_id],
    }
  }

  if (rule.scope_type === "option" && rule.option_value_id) {
    return {
      ...base,
      option_value_id: rule.option_value_id,
    }
  }

  return null
}

function formatRuleScope(rule: TtvComboRule) {
  if (rule.scope_type === "all") {
    return "All storefront products"
  }

  const scopeLabels: Record<TtvComboRule["scope_type"], string> = {
    all: "All",
    product: "Product",
    category: "Category",
    collection: "Collection",
    option: "Product option",
  }

  return scopeLabels[rule.scope_type]
}

function formatTiers(rule: TtvComboRule, currencyCode?: string) {
  return [...rule.tiers]
    .sort((a, b) => a.minimum_quantity - b.minimum_quantity)
    .map((tier) => {
      const discount = formatTierValue(tier, currencyCode)
      const featured = tier.is_featured ? " - featured" : ""
      const shipping = tier.is_free_shipping ? " - freeship" : ""

      return `${tier.minimum_quantity}+ ${discount}${featured}${shipping}`
    })
    .join(" / ")
}

function formatTierValue(
  tier: TtvComboRule["tiers"][number],
  currencyCode?: string
) {
  if (tier.discount_type === "percentage") {
    return `${tier.discount_value}% off`
  }

  if (tier.discount_type === "fixed_total") {
    return `${formatAmount(tier.discount_value, currencyCode)} total`
  }

  return `${formatAmount(tier.discount_value, currencyCode)} off/item`
}

function formatAmount(amount: number, currencyCode = "vnd") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount)
}
