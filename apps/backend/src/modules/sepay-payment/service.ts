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

import SepayModuleService from "../sepay/service"
import {
  SePayApiError,
  SePayClient,
  type SePayCheckoutFields,
  type SePayEnvironment,
  type SePayIpnBody,
  type SePayPaymentMethod,
  type SePayRemoteOrder,
  verifySePayIpnSecret,
} from "./client"

export type SePayPaymentProviderOptions = {
  environment: SePayEnvironment
  merchantId: string
  secretKey: string
  successUrl: string
  errorUrl: string
  cancelUrl: string
  paymentMethod?: SePayPaymentMethod
  ipnSecret?: string
}

type ResolvedSePayOptions = SePayPaymentProviderOptions & {
  paymentMethod: SePayPaymentMethod
  ipnSecret: string
}

type InjectedDependencies = {
  logger: Logger
  sepay: SepayModuleService
}

type SePayAttemptStatus =
  | "creating"
  | "pending"
  | "processing"
  | "paid"
  | "cancelled"
  | "failed"

type SePayAttempt = {
  id: string
  payment_session_id: string
  invoice_number: string
  sepay_order_id?: string | null
  transaction_id?: string | null
  amount: unknown
  currency_code: string
  payment_method: SePayPaymentMethod
  status: SePayAttemptStatus
  checkout_url?: string | null
  checkout_fields?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  created_at?: Date | string
}

type SePaySessionData = Record<string, unknown> & {
  session_id?: string
  invoice_number?: string
  sepay_order_id?: string
  transaction_id?: string
  checkout_url?: string
  checkout_fields?: SePayCheckoutFields
  payment_method?: SePayPaymentMethod
  sepay_status?: string
  amount?: number
}

type SePayAttemptUpdate = Partial<
  Pick<
    SePayAttempt,
    | "status"
    | "sepay_order_id"
    | "transaction_id"
    | "checkout_url"
    | "checkout_fields"
    | "metadata"
  >
>

class SePayPaymentProviderService extends AbstractPaymentProvider<SePayPaymentProviderOptions> {
  static identifier = "sepay"

  private readonly logger: Logger
  private readonly sepayService: SepayModuleService
  private readonly client: SePayClient
  private readonly options: ResolvedSePayOptions

  static validateOptions(options: Record<string, unknown>) {
    for (const key of [
      "environment",
      "merchantId",
      "secretKey",
      "successUrl",
      "errorUrl",
      "cancelUrl",
    ]) {
      if (typeof options[key] !== "string" || !options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `SePay option ${key} is required`
        )
      }
    }

    if (!isSePayEnvironment(options.environment)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SePay environment must be sandbox or production"
      )
    }

    if (
      options.paymentMethod !== undefined &&
      !isSePayPaymentMethod(options.paymentMethod)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SePay paymentMethod must be BANK_TRANSFER or NAPAS_BANK_TRANSFER"
      )
    }

    if (
      options.ipnSecret !== undefined &&
      (typeof options.ipnSecret !== "string" || !options.ipnSecret)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SePay ipnSecret must be a non-empty string"
      )
    }

    for (const key of ["successUrl", "errorUrl", "cancelUrl"] as const) {
      validateCallbackUrl(options[key] as string, key)
    }
  }

  constructor(
    container: InjectedDependencies,
    options: SePayPaymentProviderOptions
  ) {
    super(container, options)
    this.logger = container.logger
    this.sepayService = container.sepay
    this.options = {
      ...options,
      paymentMethod: options.paymentMethod ?? "BANK_TRANSFER",
      ipnSecret: options.ipnSecret ?? options.secretKey,
    }
    this.client = new SePayClient(options)
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const sessionId = getRequiredSessionId(input.data)
    const amount = normalizeVndAmount(input.amount)
    validateCurrency(input.currency_code)

    const attempts = await this.listAttemptsForSession(sessionId)
    const reusable = attempts.find(
      (attempt) =>
        Number(attempt.amount) === amount &&
        attempt.payment_method === this.options.paymentMethod &&
        ["creating", "pending", "processing"].includes(attempt.status)
    )

    if (reusable) {
      return this.ensureCheckout(reusable)
    }

    return this.createPaymentAttempt(sessionId, amount)
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const sessionId = getRequiredSessionId(input.data)
    const amount = normalizeVndAmount(input.amount)
    validateCurrency(input.currency_code)
    const data = asSessionData(input.data)

    if (
      Number(data.amount) === amount &&
      data.payment_method === this.options.paymentMethod &&
      data.checkout_url &&
      data.checkout_fields
    ) {
      return {
        data,
        status: mapSePayStatusToPaymentSession(data.sepay_status),
      }
    }

    await this.cancelRemotePayment(data, "Cart total or payment method changed")
    return this.createPaymentAttempt(sessionId, amount)
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return {
      data: await this.cancelRemotePayment(
        asSessionData(input.data),
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
        "SePay payment has not been completed"
      )
    }

    return { data: result.data }
  }

  async refundPayment(
    _input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Automatic SePay refunds are not configured. Refund the payment through the acquiring bank and record it in Medusa."
    )
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const data = asSessionData(input.data)
    const attempt = await this.getRequiredAttempt(data)

    if (isFinalAttemptStatus(attempt.status)) {
      return { data: toPublicSessionData(attempt) }
    }

    try {
      const order = await this.client.retrieveOrder(attempt.invoice_number)
      const updated = await this.updateAttemptFromRemoteOrder(attempt, order)
      return { data: toPublicSessionData(updated) }
    } catch (error) {
      if (error instanceof SePayApiError && error.httpStatus === 404) {
        return { data: toPublicSessionData(attempt) }
      }

      throw error
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return {
      data: await this.cancelRemotePayment(
        asSessionData(input.data),
        "Order was cancelled"
      ),
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const { data } = await this.retrievePayment(input)

    return {
      data,
      status: mapSePayStatusToPaymentSession(data?.sepay_status),
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const receivedSecret = getHeader(payload.headers, "x-secret-key")
    if (!verifySePayIpnSecret(receivedSecret, this.options.ipnSecret)) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid SePay IPN secret"
      )
    }

    const body = parseIpnBody(payload.data)
    const [attempt] = (await this.sepayService.listSepayPaymentAttempts({
      invoice_number: body.order.order_invoice_number,
    })) as SePayAttempt[]

    if (!attempt) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const amount = normalizeVndAmount(body.order.order_amount)
    if (
      Number(attempt.amount) !== amount ||
      body.order.order_currency.toLowerCase() !== attempt.currency_code
    ) {
      await this.updateAttempt(attempt.id, {
        status: "failed",
        metadata: toIpnMetadata(body),
      })
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SePay IPN amount or currency does not match the payment session"
      )
    }

    if (
      body.notification_type === "ORDER_PAID" &&
      body.order.order_status === "CAPTURED"
    ) {
      await this.updateAttempt(attempt.id, {
        status: "paid",
        sepay_order_id: body.order.order_id,
        transaction_id: readTransactionId(body),
        metadata: toIpnMetadata(body),
      })

      if (attempt.status === "cancelled") {
        this.logger.error(
          `SePay received money for cancelled invoice ${attempt.invoice_number}; manual reconciliation is required`
        )
        return { action: PaymentActions.NOT_SUPPORTED }
      }

      return {
        action: PaymentActions.SUCCESSFUL,
        data: {
          session_id: attempt.payment_session_id,
          amount: new BigNumber(amount),
        },
      }
    }

    if (
      body.notification_type === "TRANSACTION_VOID" ||
      isCanceledSePayStatus(body.order.order_status)
    ) {
      if (attempt.status === "paid") {
        this.logger.error(
          `SePay voided paid invoice ${attempt.invoice_number}; manual reconciliation is required`
        )
        return { action: PaymentActions.NOT_SUPPORTED }
      }

      await this.updateAttempt(attempt.id, {
        status: "cancelled",
        sepay_order_id: body.order.order_id,
        transaction_id: readTransactionId(body),
        metadata: toIpnMetadata(body),
      })

      return {
        action: PaymentActions.FAILED,
        data: {
          session_id: attempt.payment_session_id,
          amount: new BigNumber(amount),
        },
      }
    }

    return { action: PaymentActions.NOT_SUPPORTED }
  }

  private async createPaymentAttempt(
    sessionId: string,
    amount: number
  ): Promise<InitiatePaymentOutput> {
    const attempt = (await this.sepayService.createSepayPaymentAttempts({
      payment_session_id: sessionId,
      invoice_number: createInvoiceNumber(),
      amount,
      currency_code: "vnd",
      payment_method: this.options.paymentMethod,
      status: "creating",
    })) as SePayAttempt

    return this.ensureCheckout(attempt)
  }

  private async ensureCheckout(
    attempt: SePayAttempt
  ): Promise<InitiatePaymentOutput> {
    if (attempt.checkout_url && attempt.checkout_fields) {
      return toInitiatePaymentOutput(attempt)
    }

    try {
      const checkout = this.client.createCheckout({
        invoiceNumber: attempt.invoice_number,
        amount: normalizeVndAmount(attempt.amount),
        description: createDescription(attempt.invoice_number),
        paymentMethod: attempt.payment_method,
        successUrl: this.options.successUrl,
        errorUrl: this.options.errorUrl,
        cancelUrl: this.options.cancelUrl,
      })
      const updated = await this.updateAttempt(attempt.id, {
        status: "pending",
        checkout_url: checkout.checkoutUrl,
        checkout_fields: checkout.fields,
      })

      return toInitiatePaymentOutput(updated)
    } catch (error) {
      await this.updateAttempt(attempt.id, { status: "failed" })
      throw error
    }
  }

  private async cancelRemotePayment(
    data: SePaySessionData,
    reason: string
  ): Promise<SePaySessionData> {
    const attempt = await this.getAttempt(data)
    if (!attempt || attempt.status === "cancelled") {
      return attempt ? toPublicSessionData(attempt) : data
    }

    if (attempt.status === "paid") {
      return toPublicSessionData(attempt)
    }

    try {
      await this.client.cancelOrder(attempt.invoice_number)
    } catch (error) {
      if (!(error instanceof SePayApiError && error.httpStatus === 404)) {
        try {
          const remoteOrder = await this.client.retrieveOrder(
            attempt.invoice_number
          )
          const updated = await this.updateAttemptFromRemoteOrder(
            attempt,
            remoteOrder
          )

          if (!isFinalAttemptStatus(updated.status)) {
            throw error
          }

          return toPublicSessionData(updated)
        } catch (retrieveError) {
          if (
            !(retrieveError instanceof SePayApiError) ||
            retrieveError.httpStatus !== 404
          ) {
            throw error
          }
        }
      }
    }

    const updated = await this.updateAttempt(attempt.id, {
      status: "cancelled",
      metadata: {
        ...(attempt.metadata ?? {}),
        cancellation_reason: reason,
      },
    })
    return toPublicSessionData(updated)
  }

  private async updateAttemptFromRemoteOrder(
    attempt: SePayAttempt,
    order: SePayRemoteOrder
  ): Promise<SePayAttempt> {
    if (
      order.invoiceNumber !== attempt.invoice_number ||
      order.currency.toLowerCase() !== attempt.currency_code ||
      order.amount !== Number(attempt.amount)
    ) {
      await this.updateAttempt(attempt.id, { status: "failed" })
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SePay order does not match the payment session"
      )
    }

    return this.updateAttempt(attempt.id, {
      status: mapSePayStatusToAttempt(order.status),
      sepay_order_id: order.orderId,
      transaction_id: order.transactionId ?? attempt.transaction_id,
      metadata: {
        order_status: order.status,
      },
    })
  }

  private async listAttemptsForSession(
    sessionId: string
  ): Promise<SePayAttempt[]> {
    return (await this.sepayService.listSepayPaymentAttempts(
      { payment_session_id: sessionId },
      { order: { created_at: "DESC" }, take: 20 }
    )) as SePayAttempt[]
  }

  private async getAttempt(
    data: SePaySessionData
  ): Promise<SePayAttempt | undefined> {
    if (data.invoice_number) {
      return (
        (await this.sepayService.listSepayPaymentAttempts({
          invoice_number: data.invoice_number,
        })) as SePayAttempt[]
      )[0]
    }

    if (data.session_id) {
      return (await this.listAttemptsForSession(data.session_id))[0]
    }

    return undefined
  }

  private async getRequiredAttempt(data: SePaySessionData) {
    const attempt = await this.getAttempt(data)
    if (!attempt) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No SePay payment attempt was found for this session"
      )
    }

    return attempt
  }

  private async updateAttempt(
    id: string,
    data: SePayAttemptUpdate
  ): Promise<SePayAttempt> {
    return (await this.sepayService.updateSepayPaymentAttempts({
      id,
      ...data,
    })) as SePayAttempt
  }
}

export function mapSePayStatusToPaymentSession(
  status: unknown
): (typeof PaymentSessionStatus)[keyof typeof PaymentSessionStatus] {
  switch (String(status).toUpperCase()) {
    case "CAPTURED":
    case "PAID":
      return PaymentSessionStatus.CAPTURED
    case "CANCELLED":
    case "CANCELED":
      return PaymentSessionStatus.CANCELED
    case "FAILED":
    case "ERROR":
    case "DECLINED":
    case "AUTHENTICATION_FAILED":
      return PaymentSessionStatus.ERROR
    default:
      return PaymentSessionStatus.PENDING
  }
}

function mapSePayStatusToAttempt(status: unknown): SePayAttemptStatus {
  switch (String(status).toUpperCase()) {
    case "CAPTURED":
    case "PAID":
      return "paid"
    case "CANCELLED":
    case "CANCELED":
      return "cancelled"
    case "FAILED":
    case "ERROR":
    case "DECLINED":
    case "AUTHENTICATION_FAILED":
      return "failed"
    case "AUTHENTICATION_NOT_NEEDED":
    case "PENDING":
      return "pending"
    default:
      return "processing"
  }
}

function toInitiatePaymentOutput(
  attempt: SePayAttempt
): InitiatePaymentOutput {
  return {
    id: attempt.invoice_number,
    status: mapSePayStatusToPaymentSession(attempt.status),
    data: toPublicSessionData(attempt),
  }
}

function toPublicSessionData(attempt: SePayAttempt): SePaySessionData {
  const checkoutFields = asCheckoutFields(attempt.checkout_fields)

  return {
    session_id: attempt.payment_session_id,
    invoice_number: attempt.invoice_number,
    ...(attempt.sepay_order_id
      ? { sepay_order_id: attempt.sepay_order_id }
      : {}),
    ...(attempt.transaction_id
      ? { transaction_id: attempt.transaction_id }
      : {}),
    ...(attempt.checkout_url ? { checkout_url: attempt.checkout_url } : {}),
    ...(checkoutFields ? { checkout_fields: checkoutFields } : {}),
    payment_method: attempt.payment_method,
    sepay_status: attempt.status.toUpperCase(),
    amount: Number(attempt.amount),
  }
}

function asSessionData(
  data: Record<string, unknown> | undefined
): SePaySessionData {
  return (data ?? {}) as SePaySessionData
}

function asCheckoutFields(
  value: Record<string, unknown> | null | undefined
): SePayCheckoutFields | undefined {
  if (!value) {
    return undefined
  }

  return Object.entries(value).reduce<SePayCheckoutFields>(
    (result, [key, fieldValue]) => {
      if (typeof fieldValue === "string" || typeof fieldValue === "number") {
        result[key] = fieldValue
      }

      return result
    },
    {}
  )
}

function getRequiredSessionId(data?: Record<string, unknown>): string {
  const sessionId = data?.session_id
  if (typeof sessionId !== "string" || !sessionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "SePay requires a Medusa payment session ID"
    )
  }

  return sessionId
}

function normalizeVndAmount(amount: unknown): number {
  const value = Number(amount)
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "SePay amount must be a positive VND integer"
    )
  }

  return value
}

function validateCurrency(currencyCode: string) {
  if (currencyCode.toLowerCase() !== "vnd") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "SePay is only enabled for VND payments"
    )
  }
}

function validateCallbackUrl(value: string, key: string) {
  let url: URL | undefined

  try {
    url = new URL(value)
  } catch {
    url = undefined
  }

  if (!url || !["http:", "https:"].includes(url.protocol)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `SePay option ${key} must be a valid HTTP(S) URL`
    )
  }
}

function createInvoiceNumber(): string {
  return `TTV${Date.now()}${randomInt(1000, 10000)}`
}

function createDescription(invoiceNumber: string): string {
  return `Thanh toan don hang ${invoiceNumber}`
}

function isFinalAttemptStatus(status: SePayAttemptStatus): boolean {
  return ["paid", "cancelled", "failed"].includes(status)
}

function isCanceledSePayStatus(status: string): boolean {
  return ["CANCELLED", "CANCELED"].includes(status.toUpperCase())
}

function isSePayEnvironment(value: unknown): value is SePayEnvironment {
  return value === "sandbox" || value === "production"
}

function isSePayPaymentMethod(value: unknown): value is SePayPaymentMethod {
  return value === "BANK_TRANSFER" || value === "NAPAS_BANK_TRANSFER"
}

function getHeader(
  headers: Record<string, unknown>,
  expectedName: string
): unknown {
  const entry = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === expectedName.toLowerCase()
  )
  const value = entry?.[1]

  return Array.isArray(value) ? value[0] : value
}

function parseIpnBody(data: unknown): SePayIpnBody {
  if (!data || typeof data !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid SePay IPN body"
    )
  }

  const body = data as Partial<SePayIpnBody>
  const order = body.order
  if (
    !Number.isSafeInteger(Number(body.timestamp)) ||
    typeof body.notification_type !== "string" ||
    !order ||
    typeof order !== "object" ||
    typeof order.order_id !== "string" ||
    typeof order.order_invoice_number !== "string" ||
    typeof order.order_status !== "string" ||
    typeof order.order_currency !== "string" ||
    !Number.isSafeInteger(Number(order.order_amount))
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid SePay IPN fields"
    )
  }

  return body as SePayIpnBody
}

function readTransactionId(body: SePayIpnBody): string | undefined {
  const transactionId =
    body.transaction?.transaction_id ?? body.transaction?.id
  return typeof transactionId === "string" && transactionId
    ? transactionId
    : undefined
}

function toIpnMetadata(body: SePayIpnBody): Record<string, unknown> {
  return {
    notification_type: body.notification_type,
    timestamp: body.timestamp,
    order_status: body.order.order_status,
    transaction_status: body.transaction?.transaction_status,
  }
}

export default SePayPaymentProviderService
