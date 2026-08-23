import type { StoreQuantityPrice } from "@lib/data/quantity-prices"
import { convertToLocale } from "@lib/util/money"
import { Text, clx } from "@modules/common/components/ui"

type QuantityPriceListProps = {
  prices: StoreQuantityPrice[]
  currencyCode: string
  quantity: number
  highlightActiveTier?: boolean
}

export default function QuantityPriceList({
  prices,
  currencyCode,
  quantity,
  highlightActiveTier = true,
}: QuantityPriceListProps) {
  const groups = groupQuantityPricesByPriceList(prices)

  if (!groups.length) {
    return null
  }

  return (
    <div className="grid gap-3 rounded-lg border border-[#d8ddd7] bg-[#f7f8f5] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text className="text-sm font-semibold uppercase tracking-[0.08em] text-[#343a33]">
          Khuyến mại
        </Text>
      </div>
      <div className="grid gap-3">
        {groups.map((group) => {
          const activeTier = highlightActiveTier
            ? getActiveTier(group.tiers, quantity)
            : undefined

          return (
            <section
              key={group.id}
              className="grid gap-3 rounded-lg border border-[#b9c9b4] bg-white p-3 shadow-sm"
            >
              {group.title ? (
                <h3 className="text-sm font-semibold text-[#386331]">
                  {group.title}
                </h3>
              ) : null}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.tiers.map((tier) => {
                  const isActive = tier === activeTier

                  return (
                    <div
                      key={`${tier.min_quantity}-${tier.max_quantity ?? "up"}-${tier.amount}`}
                      className={clx(
                        "flex min-h-28 flex-col rounded-md border px-4 py-3",
                        {
                          "border-[#47713e] bg-[#f4f8f1] ring-1 ring-[#47713e]":
                            isActive,
                          "border-[#dde3da] bg-[#fafbf9]": !isActive,
                        }
                      )}
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-[#72806c]">
                        Số lượng {formatQuantityBounds(tier)}
                      </span>
                      <span className="mt-1 text-base font-bold text-[#20251f]">
                        {convertToLocale({
                          amount: tier.amount,
                          currency_code: tier.currency_code || currencyCode,
                        })}
                        /tranh
                      </span>
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        {tier.discount_percentage ? (
                          <span className="text-xs font-medium text-[#4d7b42]">
                            Giảm {formatPercentage(tier.discount_percentage)}%
                          </span>
                        ) : (
                          <span />
                        )}
                        {isActive ? (
                          <span className="rounded-full bg-[#dcebd8] px-2 py-0.5 text-[10px] font-semibold text-[#386331]">
                            Đang áp dụng
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function groupQuantityPricesByPriceList(prices: StoreQuantityPrice[]) {
  const groups = new Map<
    string,
    { id: string; title: string | null; tiers: StoreQuantityPrice[] }
  >()

  for (const price of [...prices].sort(
    (first, second) => first.min_quantity - second.min_quantity
  )) {
    const group = groups.get(price.price_list_id) ?? {
      id: price.price_list_id,
      title: price.price_list_title?.trim() || null,
      tiers: [],
    }

    group.tiers.push(price)
    groups.set(price.price_list_id, group)
  }

  return Array.from(groups.values())
}

function getActiveTier(prices: StoreQuantityPrice[], quantity: number) {
  return [...prices]
    .filter(
      (price) =>
        quantity >= price.min_quantity &&
        (price.max_quantity === null || quantity <= price.max_quantity)
    )
    .sort((first, second) => second.min_quantity - first.min_quantity)[0]
}

function formatQuantityBounds(tier: StoreQuantityPrice): string {
  if (tier.max_quantity === tier.min_quantity) {
    return String(tier.min_quantity)
  }

  if (tier.max_quantity) {
    return `${tier.min_quantity}–${tier.max_quantity}`
  }

  return `${tier.min_quantity}+`
}

function formatPercentage(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}
