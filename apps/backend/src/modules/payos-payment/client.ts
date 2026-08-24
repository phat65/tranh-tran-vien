import { createHmac, timingSafeEqual } from "node:crypto"

export type PayOSPaymentLinkStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "CANCELLED"
  | "EXPIRED"
  | string

export type PayOSPaymentLink = {
  bin?: string
  accountNumber?: string
  accountName?: string
  amount: number
  description: string
  orderCode: number
  currency?: string
  paymentLinkId: string
  status: PayOSPaymentLinkStatus
  checkoutUrl?: string
  qrCode?: string
  reference?: string
}

export type PayOSWebhookData = {
  orderCode: number
  amount: number
  description?: string
  accountNumber?: string
  reference?: string
  transactionDateTime?: string
  currency?: string
  paymentLinkId?: string
  code?: string
  desc?: string
  counterAccountBankId?: string | null
  counterAccountBankName?: string | null
  counterAccountName?: string | null
  counterAccountNumber?: string | null
  virtualAccountName?: string | null
  virtualAccountNumber?: string | null
  [key: string]: unknown
}

export type PayOSWebhookBody = {
  code: string
  desc: string
  success: boolean
  data: PayOSWebhookData
  signature: string
}

export type CreatePayOSPaymentLinkInput = {
  orderCode: number
  amount: number
  description: string
  cancelUrl: string
  returnUrl: string
}

type PayOSClientOptions = {
  clientId: string
  apiKey: string
  checksumKey: string
  apiUrl?: string
  partnerCode?: string
  timeoutMs?: number
}

type PayOSResponse<T> = {
  code: string
  desc: string
  data: T
  signature?: string
}

export class PayOSApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
    readonly code?: string
  ) {
    super(message)
    this.name = "PayOSApiError"
  }
}

export class PayOSClient {
  private readonly apiUrl: string
  private readonly timeoutMs: number

  constructor(private readonly options: PayOSClientOptions) {
    this.apiUrl = (options.apiUrl ?? "https://api-merchant.payos.vn").replace(
      /\/$/,
      ""
    )
    this.timeoutMs = options.timeoutMs ?? 15_000
  }

  async createPaymentLink(
    input: CreatePayOSPaymentLinkInput
  ): Promise<PayOSPaymentLink> {
    return this.request<PayOSPaymentLink>("/v2/payment-requests", {
      method: "POST",
      body: {
        ...input,
        signature: createPayOSPaymentRequestSignature(
          input,
          this.options.checksumKey
        ),
      },
    })
  }

  async getPaymentLink(id: string | number): Promise<PayOSPaymentLink> {
    return this.request<PayOSPaymentLink>(
      `/v2/payment-requests/${encodeURIComponent(String(id))}`,
      { method: "GET" }
    )
  }

  async cancelPaymentLink(
    id: string | number,
    cancellationReason = "Cart payment session was cancelled"
  ): Promise<PayOSPaymentLink> {
    return this.request<PayOSPaymentLink>(
      `/v2/payment-requests/${encodeURIComponent(String(id))}/cancel`,
      {
        method: "POST",
        body: { cancellationReason },
      }
    )
  }

  async confirmWebhook(webhookUrl: string): Promise<string> {
    const data = await this.request<string>("/confirm-webhook", {
      method: "POST",
      body: { webhookUrl },
    })

    return data
  }

  private async request<T>(
    path: string,
    options: { method: "GET" | "POST"; body?: Record<string, unknown> }
  ): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.apiUrl}${path}`, {
        method: options.method,
        headers: {
          "content-type": "application/json",
          "x-client-id": this.options.clientId,
          "x-api-key": this.options.apiKey,
          ...(this.options.partnerCode
            ? { "x-partner-code": this.options.partnerCode }
            : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      })

      const payload = (await response.json().catch(() => null)) as
        | PayOSResponse<T>
        | null

      if (!response.ok || !payload || payload.code !== "00") {
        throw new PayOSApiError(
          payload?.desc || `PayOS request failed with HTTP ${response.status}`,
          response.status,
          payload?.code
        )
      }

      return payload.data
    } catch (error) {
      if (error instanceof PayOSApiError) {
        throw error
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new PayOSApiError("PayOS request timed out")
      }

      throw new PayOSApiError(
        error instanceof Error ? error.message : "Unable to reach PayOS"
      )
    } finally {
      clearTimeout(timeout)
    }
  }
}

export function createPayOSPaymentRequestSignature(
  input: CreatePayOSPaymentLinkInput,
  checksumKey: string
): string {
  const raw = [
    `amount=${input.amount}`,
    `cancelUrl=${input.cancelUrl}`,
    `description=${input.description}`,
    `orderCode=${input.orderCode}`,
    `returnUrl=${input.returnUrl}`,
  ].join("&")

  return createHmac("sha256", checksumKey).update(raw).digest("hex")
}

export function createPayOSDataSignature(
  data: Record<string, unknown>,
  checksumKey: string
): string {
  const raw = Object.keys(data)
    .sort()
    .map((key) => `${key}=${serializePayOSSignatureValue(data[key])}`)
    .join("&")

  return createHmac("sha256", checksumKey).update(raw).digest("hex")
}

export function verifyPayOSDataSignature(
  data: Record<string, unknown>,
  signature: string,
  checksumKey: string
): boolean {
  if (!signature || !/^[a-f\d]{64}$/i.test(signature)) {
    return false
  }

  const expected = Buffer.from(
    createPayOSDataSignature(data, checksumKey),
    "hex"
  )
  const received = Buffer.from(signature, "hex")

  return expected.length === received.length && timingSafeEqual(expected, received)
}

function serializePayOSSignatureValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => sortObjectDeep(item)))
  }

  if (typeof value === "object") {
    return JSON.stringify(sortObjectDeep(value))
  }

  return String(value)
}

function sortObjectDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectDeep(item))
  }

  if (!value || typeof value !== "object") {
    return value
  }

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortObjectDeep((value as Record<string, unknown>)[key])
      return result
    }, {})
}
