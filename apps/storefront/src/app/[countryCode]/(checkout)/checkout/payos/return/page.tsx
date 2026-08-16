import PayOSReturn from "@modules/checkout/components/payos-return"
import type { Metadata } from "next"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata: Metadata = {
  title: "PayOS Payment",
}

export default async function PayOSReturnPage({ searchParams }: Props) {
  const query = await searchParams
  const status = getSingleValue(query.status)
  const cancelled = getSingleValue(query.cancel)?.toLowerCase() === "true"

  return <PayOSReturn status={status} cancelled={cancelled} />
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
