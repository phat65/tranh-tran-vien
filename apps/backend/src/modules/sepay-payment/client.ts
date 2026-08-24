import { createHmac, timingSafeEqual } from "node:crypto"

export function createSePayQrCodeUrl(input: {
  bankAccount: string
  bankCode: string
  amount: number
  description: string
  accountHolder?: string
  storeName?: string
}) {
  const url = new URL("https://vietqr.app/img")
  url.searchParams.set("acc", input.bankAccount)
  url.searchParams.set("bank", input.bankCode)
  url.searchParams.set("amount", String(input.amount))
  url.searchParams.set("des", input.description)
  url.searchParams.set("template", "compact")
  url.searchParams.set("showinfo", "true")

  if (input.accountHolder) {
    url.searchParams.set("holder", input.accountHolder)
  }

  if (input.storeName) {
    url.searchParams.set("store", input.storeName)
  }

  return url.toString()
}

export function verifySePayWebhookSignature(input: {
  rawData: string | Buffer
  signature: unknown
  timestamp: unknown
  secret: string
  now?: number
}) {
  if (
    typeof input.signature !== "string" ||
    typeof input.timestamp !== "string" ||
    !input.signature.startsWith("sha256=")
  ) {
    return false
  }

  const timestamp = Number(input.timestamp)
  const now = input.now ?? Date.now()

  if (
    !Number.isSafeInteger(timestamp) ||
    Math.abs(now / 1000 - timestamp) > 300
  ) {
    return false
  }

  const rawData = Buffer.isBuffer(input.rawData)
    ? input.rawData
    : Buffer.from(input.rawData)
  const expected = `sha256=${createHmac("sha256", input.secret)
    .update(`${timestamp}.`)
    .update(rawData)
    .digest("hex")}`
  const receivedBuffer = Buffer.from(input.signature)
  const expectedBuffer = Buffer.from(expected)

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  )
}
