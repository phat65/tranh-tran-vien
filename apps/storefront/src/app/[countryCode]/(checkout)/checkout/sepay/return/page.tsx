import SePayReturn, {
  type SePayReturnResult,
} from "@modules/checkout/components/sepay-return"
import type { Metadata } from "next"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata: Metadata = {
  title: "SePay Payment",
}

export default async function SePayReturnPage({ searchParams }: Props) {
  const query = await searchParams
  const result = parseResult(getSingleValue(query.result))

  return <SePayReturn result={result} />
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseResult(value: string | undefined): SePayReturnResult | undefined {
  const normalized = value?.toLowerCase()

  return normalized === "success" ||
    normalized === "error" ||
    normalized === "cancel"
    ? normalized
    : undefined
}
