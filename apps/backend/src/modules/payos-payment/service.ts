import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import { randomInt } from "node:crypto"

import PayosModuleService from "../payos/service"
import {
  PayOSApiError,
  PayOSClient,
  type PayOSPaymentLink,
  type PayOSPaymentLinkStatus,
  type PayOSWebhookBody,
  verifyPayOSDataSignature,
} from "./client"

export type PayOSPaymentProviderOptions = {
  clientId: string
  apiKey: string
  checksumKey: string
  returnUrl: string
  cancelUrl: string
  apiUrl?: string
  partnerCode?: string
}

type InjectedDependencies = {
  logger: Logger
  payos: PayosModuleService
}

type PayOSAttempt = {
  id: string
  payment_session_id: string
  order_code: string
  payment_link_id?: string | null
  amount: unknown
  currency_code: string
  status:
    | "creating"
    | "pending"
    | "processing"
    | "paid"
    | "cancelled"
    | "failed"
  checkout_url?: string | null
  qr_code?: string | null
  reference?: string | null
  created_at?: Date | string
}

type PayOSSessionData = Record<string, unknown> & {
  session_id?: string
  order_code?: string | number
  payment_link_id?: string
  checkout_url?: string
  qr_code?: string
  payos_status?: string
  amount?: number
}

type PayOSAttemptUpdate = Partial<
  Pick<
    PayOSAttempt,
    | "status"
    | "payment_link_id"
    | "checkout_url"
    | "qr_code"
    | "reference"
  >
>

class PayOSPaymentProviderService extends AbstractPaymentProvider<PayOSPaymentProviderOptions> {
  static identifier = "payos"

  private readonly logger: Logger
  private readonly payosService: PayosModuleService
  private readonly client: PayOSClient

  static validateOptions(options: Record<string, unknown>) {
    for (const key of [
      "clientId",
      "apiKey",
      "checksumKey",
      "returnUrl",
      "cancelUrl",
    ]) {
      if (typeof options[key] !== "string" || !options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `PayOS option ${key} is required`
        )
      }
    }
  }

  constructor(
    container: InjectedDependencies,
    options: PayOSPaymentProviderOptions
  ) {
    super(container, options)
    this.logger = container.logger
    this.payosService = container.payos
    this.client = new PayOSClient(options)
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const sessionId = getRequiredSessionId(input.data)
    const amount = normalizeVndAmount(input.amount)
    validateCurrency(input.currency_code)

    const attempts = (await this.payosService.listPayosPaymentAttempts(
      { payment_session_id: sessionId },
      { order: { created_at: "DESC" }, take: 20 }
    )) as PayOSAttempt[]
    const reusable = attempts.find(
      (attempt) =>
        Number(attempt.amount) === amount &&
        ["creating", "pending", "processing"].includes(attempt.status)
    )

    if (reusable) {
      return this.ensureRemotePaymentLink(reusable)
    }

    return this.createPaymentAttempt(sessionId, amount)
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const sessionId = getRequiredSessionId(input.data)
    const amount = normalizeVndAmount(input.amount)
    validateCurrency(input.currency_code)

    const currentAmount = Number(input.data?.amount)
    if (
      currentAmount === amount &&
      typeof input.data?.checkout_url === "string"
    ) {
      return {
        data: input.data,
        status: mapPayOSStatusToPaymentSession(input.data.payos_status),
      }
    }

    await this.cancelRemotePayment(input.data, "Cart total changed")
    return this.createPaymentAttempt(sessionId, amount)
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return {
      data: await this.cancelRemotePayment(
        input.data,
        "Payment method was changed"
      ),
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const result = await this.getPaymentStatus(input)

    return {
      data: result.data,
      status: result.status,
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const result = await this.getPaymentStatus(input)

    if (result.status !== PaymentSessionStatus.CAPTURED) {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        "PayOS payment has not been completed"
      )
    }

    return { data: result.data }
  }

  async refundPayment(
    _input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "PayOS payment-link refunds are not supported. Refund the bank transfer manually and record it in Medusa."
    )
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const data = asSessionData(input.data)
    const identifier = getRemoteIdentifier(data)
    const paymentLink = await this.client.getPaymentLink(identifier)

    await this.updateAttemptFromPaymentLink(paymentLink)

    return {
      data: toPublicSessionData(data.session_id, paymentLink),
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return {
      data: await this.cancelRemotePayment(input.data, "Order was cancelled"),
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const { data } = await this.retrievePayment(input)

    return {
      data,
      status: mapPayOSStatusToPaymentSession(data?.payos_status),
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const body = parseWebhookBody(payload.data)

    if (
      !verifyPayOSDataSignature(
        body.data,
        body.signature,
        this.config.checksumKey
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid PayOS webhook signature"
      )
    }

    const [attempt] = (await this.payosService.listPayosPaymentAttempts({
      order_code: String(body.data.orderCode),
    })) as PayOSAttempt[]

    // PayOS sends a signed sample payload while confirming a webhook URL.
    if (!attempt) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    if (Number(attempt.amount) !== Number(body.data.amount)) {
      await this.updateAttempt(attempt.id, { status: "failed" })
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayOS webhook amount does not match the payment session"
      )
    }

    const reference =
      typeof body.data.reference === "string" ? body.data.reference : null

    if (body.success && body.code === "00") {
      await this.updateAttempt(attempt.id, {
        status: "paid",
        reference,
        payment_link_id:
          typeof body.data.paymentLinkId === "string"
            ? body.data.paymentLinkId
            : attempt.payment_link_id,
      })

      if (attempt.status === "cancelled") {
        this.logger.error(
          `PayOS received money for cancelled orderCode ${attempt.order_code}; manual reconciliation is required`
        )
        return { action: PaymentActions.NOT_SUPPORTED }
      }

      return {
        action: PaymentActions.SUCCESSFUL,
        data: {
          session_id: attempt.payment_session_id,
          amount: new BigNumber(body.data.amount),
        },
      }
    }

    await this.updateAttempt(attempt.id, { status: "failed", reference })

    return {
      action: PaymentActions.FAILED,
      data: {
        session_id: attempt.payment_session_id,
        amount: new BigNumber(body.data.amount),
      },
    }
  }

  private async createPaymentAttempt(
    sessionId: string,
    amount: number
  ): Promise<InitiatePaymentOutput> {
    const orderCode = createOrderCode()
    const attempt = (await this.payosService.createPayosPaymentAttempts({
      payment_session_id: sessionId,
      order_code: String(orderCode),
      amount,
      currency_code: "vnd",
      status: "creating",
    })) as PayOSAttempt

    return this.ensureRemotePaymentLink(attempt)
  }

  private async ensureRemotePaymentLink(
    attempt: PayOSAttempt
  ): Promise<InitiatePaymentOutput> {
    if (attempt.payment_link_id && attempt.checkout_url) {
      return {
        id: attempt.payment_link_id,
        status: mapPayOSStatusToPaymentSession(attempt.status),
        data: toPublicSessionDataFromAttempt(attempt),
      }
    }

    const orderCode = Number(attempt.order_code)
    let paymentLink: PayOSPaymentLink

    try {
      paymentLink = await this.client.getPaymentLink(orderCode)
    } catch {
      try {
        paymentLink = await this.client.createPaymentLink({
          orderCode,
          amount: normalizeVndAmount(attempt.amount),
          description: createDescription(orderCode),
          cancelUrl: this.config.cancelUrl,
          returnUrl: this.config.returnUrl,
        })
      } catch (createError) {
        // A timeout can happen after PayOS created the link. Recover by orderCode.
        try {
          paymentLink = await this.client.getPaymentLink(orderCode)
        } catch {
          this.logger.error(
            `Unable to create PayOS link for payment session ${attempt.payment_session_id}`
          )
          throw createError
        }
      }
    }

    const updatedAttempt = await this.updateAttemptFromPaymentLink(
      paymentLink,
      attempt
    )

    return {
      id: paymentLink.paymentLinkId,
      status: mapPayOSStatusToPaymentSession(paymentLink.status),
      data: toPublicSessionDataFromAttempt(updatedAttempt),
    }
  }

  private async cancelRemotePayment(
    rawData: Record<string, unknown> | undefined,
    reason: string
  ): Promise<Record<string, unknown>> {
    const data = asSessionData(rawData)
    const identifier = getRemoteIdentifier(data, false)

    if (!identifier) {
      return data
    }

    let paymentLink: PayOSPaymentLink
    try {
      paymentLink = await this.client.cancelPaymentLink(identifier, reason)
    } catch (error) {
      try {
        paymentLink = await this.client.getPaymentLink(identifier)
      } catch {
        throw error
      }

      if (!isFinalPayOSStatus(paymentLink.status)) {
        throw error
      }
    }

    await this.updateAttemptFromPaymentLink(paymentLink)
    return toPublicSessionData(data.session_id, paymentLink)
  }

  private async updateAttemptFromPaymentLink(
    paymentLink: PayOSPaymentLink,
    knownAttempt?: PayOSAttempt
  ): Promise<PayOSAttempt> {
    const attempt =
      knownAttempt ??
      ((await this.payosService.listPayosPaymentAttempts({
        order_code: String(paymentLink.orderCode),
      })) as PayOSAttempt[])[0]

    if (!attempt) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `No PayOS attempt found for orderCode ${paymentLink.orderCode}`
      )
    }

    return this.updateAttempt(attempt.id, {
      payment_link_id: paymentLink.paymentLinkId,
      checkout_url: paymentLink.checkoutUrl ?? attempt.checkout_url,
      qr_code: paymentLink.qrCode ?? attempt.qr_code,
      reference: paymentLink.reference ?? attempt.reference,
      status: mapPayOSStatusToAttempt(paymentLink.status),
    })
  }

  private async updateAttempt(
    id: string,
    data: PayOSAttemptUpdate
  ): Promise<PayOSAttempt> {
    const updated = (await this.payosService.updatePayosPaymentAttempts({
      id,
      ...data,
    })) as PayOSAttempt

    return updated
  }
}

export function mapPayOSStatusToPaymentSession(
  status: unknown
): (typeof PaymentSessionStatus)[keyof typeof PaymentSessionStatus] {
  switch (String(status).toUpperCase()) {
    case "PAID":
    case "CAPTURED":
      return PaymentSessionStatus.CAPTURED
    case "CANCELLED":
    case "CANCELED":
    case "EXPIRED":
      return PaymentSessionStatus.CANCELED
    case "FAILED":
    case "ERROR":
      return PaymentSessionStatus.ERROR
    default:
      return PaymentSessionStatus.PENDING
  }
}

function mapPayOSStatusToAttempt(
  status: PayOSPaymentLinkStatus
): PayOSAttempt["status"] {
  switch (String(status).toUpperCase()) {
    case "PAID":
      return "paid"
    case "CANCELLED":
    case "CANCELED":
    case "EXPIRED":
      return "cancelled"
    case "PROCESSING":
      return "processing"
    case "PENDING":
      return "pending"
    default:
      return "failed"
  }
}

function toPublicSessionData(
  sessionId: string | undefined,
  paymentLink: PayOSPaymentLink
): PayOSSessionData {
  return {
    ...(sessionId ? { session_id: sessionId } : {}),
    order_code: String(paymentLink.orderCode),
    payment_link_id: paymentLink.paymentLinkId,
    ...(paymentLink.checkoutUrl
      ? { checkout_url: paymentLink.checkoutUrl }
      : {}),
    ...(paymentLink.qrCode ? { qr_code: paymentLink.qrCode } : {}),
    payos_status: paymentLink.status,
    amount: paymentLink.amount,
  }
}

function toPublicSessionDataFromAttempt(
  attempt: PayOSAttempt
): PayOSSessionData {
  return {
    session_id: attempt.payment_session_id,
    order_code: attempt.order_code,
    ...(attempt.payment_link_id
      ? { payment_link_id: attempt.payment_link_id }
      : {}),
    ...(attempt.checkout_url ? { checkout_url: attempt.checkout_url } : {}),
    ...(attempt.qr_code ? { qr_code: attempt.qr_code } : {}),
    payos_status: attempt.status.toUpperCase(),
    amount: Number(attempt.amount),
  }
}

function getRequiredSessionId(data?: Record<string, unknown>): string {
  const sessionId = data?.session_id
  if (typeof sessionId !== "string" || !sessionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayOS requires a Medusa payment session ID"
    )
  }

  return sessionId
}

function getRemoteIdentifier(
  data: PayOSSessionData,
  required = true
): string {
  const identifier = data.payment_link_id ?? data.order_code
  if (identifier !== undefined && identifier !== null && identifier !== "") {
    return String(identifier)
  }

  if (!required) {
    return ""
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "PayOS payment link ID is missing"
  )
}

function asSessionData(
  data: Record<string, unknown> | undefined
): PayOSSessionData {
  return (data ?? {}) as PayOSSessionData
}

function normalizeVndAmount(amount: unknown): number {
  const value = Number(amount)
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayOS amount must be a positive VND integer"
    )
  }

  return value
}

function validateCurrency(currencyCode: string) {
  if (currencyCode.toLowerCase() !== "vnd") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayOS is only enabled for VND payments"
    )
  }
}

function createOrderCode(): number {
  return Date.now() * 1000 + randomInt(0, 1000)
}

function createDescription(orderCode: number): string {
  return `TTV${String(orderCode).slice(-6)}`
}

function isFinalPayOSStatus(status: PayOSPaymentLinkStatus): boolean {
  return ["PAID", "CANCELLED", "CANCELED", "EXPIRED"].includes(
    String(status).toUpperCase()
  )
}

function parseWebhookBody(data: unknown): PayOSWebhookBody {
  if (!data || typeof data !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid PayOS webhook body"
    )
  }

  const body = data as Partial<PayOSWebhookBody>
  if (
    typeof body.code !== "string" ||
    typeof body.success !== "boolean" ||
    typeof body.signature !== "string" ||
    !body.data ||
    typeof body.data !== "object" ||
    !Number.isSafeInteger(Number(body.data.orderCode)) ||
    !Number.isSafeInteger(Number(body.data.amount))
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid PayOS webhook fields"
    )
  }

  return body as PayOSWebhookBody
}

export default PayOSPaymentProviderService
