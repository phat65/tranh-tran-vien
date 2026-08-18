import { timingSafeEqual } from "node:crypto"
import { SePayPgClient } from "sepay-pg-node"

export type SePayEnvironment = "sandbox" | "production"
export type SePayPaymentMethod =
  | "BANK_TRANSFER"
  | "NAPAS_BANK_TRANSFER"

export type SePayCheckoutFields = Record<string, string | number>

export type CreateSePayCheckoutInput = {
  invoiceNumber: string
  amount: number
  description: string
  paymentMethod: SePayPaymentMethod
  successUrl: string
  errorUrl: string
  cancelUrl: string
}

export type SePayCheckout = {
  checkoutUrl: string
  fields: SePayCheckoutFields
}

export type SePayRemoteOrder = {
  orderId: string
  invoiceNumber: string
  status: string
  amount: number
  currency: string
  transactionId?: string
  raw: Record<string, unknown>
}

export type SePayIpnBody = {
  timestamp: number
  notification_type: string
  order: {
    id: string
    order_id: string
    order_status: string
    order_currency: string
    order_amount: string | number
    order_invoice_number: string
    order_description?: string
    [key: string]: unknown
  }
  transaction?: {
    id?: string
    transaction_id?: string
    transaction_status?: string
    transaction_amount?: string | number
    transaction_currency?: string
    [key: string]: unknown
  }
  customer?: Record<string, unknown>
}

export type SePayClientOptions = {
  environment: SePayEnvironment
  merchantId: string
  secretKey: string
}

export class SePayApiError extends Error {
  constructor(message: string, readonly httpStatus?: number) {
    super(message)
    this.name = "SePayApiError"
  }
}

export class SePayClient {
  private readonly client: SePayPgClient

  constructor(options: SePayClientOptions) {
    this.client = new SePayPgClient({
      env: options.environment,
      merchant_id: options.merchantId,
      secret_key: options.secretKey,
    })
  }

  createCheckout(input: CreateSePayCheckoutInput): SePayCheckout {
    const fields = this.client.checkout.initOneTimePaymentFields({
      operation: "PURCHASE",
      payment_method: input.paymentMethod,
      order_invoice_number: input.invoiceNumber,
      order_amount: input.amount,
      currency: "VND",
      order_description: input.description,
      success_url: input.successUrl,
      error_url: input.errorUrl,
      cancel_url: input.cancelUrl,
    })

    return {
      checkoutUrl: this.client.checkout.initCheckoutUrl(),
      fields: normalizeCheckoutFields(fields),
    }
  }

  async retrieveOrder(invoiceNumber: string): Promise<SePayRemoteOrder> {
    try {
      const response = await this.client.order.retrieve(invoiceNumber)
      return parseRemoteOrder(response.data)
    } catch (error) {
      throw toSePayApiError(error, "Unable to retrieve SePay order")
    }
  }

  async cancelOrder(invoiceNumber: string): Promise<void> {
    try {
      await this.client.order.cancel(invoiceNumber)
    } catch (error) {
      throw toSePayApiError(error, "Unable to cancel SePay order")
    }
  }
}

export function verifySePayIpnSecret(
  receivedSecret: unknown,
  expectedSecret: string
): boolean {
  if (typeof receivedSecret !== "string" || !receivedSecret) {
    return false
  }

  const received = Buffer.from(receivedSecret)
  const expected = Buffer.from(expectedSecret)

  return received.length === expected.length && timingSafeEqual(received, expected)
}

function normalizeCheckoutFields(
  fields: Record<string, unknown>
): SePayCheckoutFields {
  return Object.entries(fields).reduce<SePayCheckoutFields>(
    (result, [key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        result[key] = value
      }

      return result
    },
    {}
  )
}

function parseRemoteOrder(payload: unknown): SePayRemoteOrder {
  const envelope = asRecord(payload)
  const order = asRecord(envelope.data ?? envelope.order ?? envelope)
  const invoiceNumber = readString(order.order_invoice_number)
  const orderId = readString(order.order_id ?? order.id)
  const status = readString(order.order_status)
  const currency = readString(order.order_currency)
  const amount = Number(order.order_amount)

  if (
    !invoiceNumber ||
    !orderId ||
    !status ||
    !currency ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    throw new SePayApiError("SePay returned an invalid order response")
  }

  const transactions = Array.isArray(order.transactions)
    ? order.transactions
    : []
  const transaction = transactions
    .map(asRecord)
    .find((item) => readString(item.transaction_status) === "APPROVED")

  return {
    orderId,
    invoiceNumber,
    status,
    amount,
    currency,
    transactionId: readString(
      transaction?.transaction_id ?? transaction?.id
    ),
    raw: order,
  }
}

function toSePayApiError(error: unknown, fallback: string): SePayApiError {
  if (error instanceof SePayApiError) {
    return error
  }

  const candidate = asRecord(error)
  const response = asRecord(candidate.response)
  const responseData = asRecord(response.data)
  const status = Number(response.status)
  const message =
    readString(responseData.message ?? responseData.error) ||
    readString(candidate.message) ||
    fallback

  return new SePayApiError(
    message,
    Number.isSafeInteger(status) ? status : undefined
  )
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined
}
