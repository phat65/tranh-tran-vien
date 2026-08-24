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
import { createSePayQrCodeUrl, verifySePayWebhookSignature } from "./client"

export type SePayPaymentProviderOptions = {
  bankAccount: string
  bankCode: string
  webhookSecret: string
  accountHolder?: string
  storeName?: string
}

type InjectedDependencies = {
  logger: Logger
  sepay: SepayModuleService
}

type SePayAttemptStatus =
  | "creating"
  | "pending"
  | "paid"
  | "cancelled"
  | "failed"

type SePayAttempt = {
  id: string
  payment_session_id: string
  invoice_number: string
  transaction_id?: string | null
  amount: unknown
  currency_code: string
  payment_method: "BANK_TRANSFER"
  status: SePayAttemptStatus
  checkout_fields?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  created_at?: Date | string
}

type SePayAttemptUpdate = Partial<
  Pick<
    SePayAttempt,
    "status" | "transaction_id" | "checkout_fields" | "metadata"
  >
>

type SePaySessionData = Record<string, unknown> & {
  session_id?: string
  invoice_number?: string
  transaction_id?: string
  checkout_fields?: Record<string, string | number>
  payment_method?: "BANK_TRANSFER"
  sepay_status?: string
  amount?: number
}

type SePayBankWebhookBody = {
  id: string | number
  gateway: string
  accountNumber: string
  code?: string
  content?: string
  transferType: string
  transferAmount: number
  referenceCode?: string
}

class SePayPaymentProviderService extends AbstractPaymentProvider<SePayPaymentProviderOptions> {
  static identifier = "sepay"

  private readonly logger: Logger
  private readonly sepayService: SepayModuleService
  private readonly options: SePayPaymentProviderOptions

  static validateOptions(options: Record<string, unknown>) {
    for (const key of ["bankAccount", "bankCode", "webhookSecret"] as const) {
      if (typeof options[key] !== "string" || !options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `SePay option ${key} is required`
        )
      }
    }
  }

  constructor(
    container: InjectedDependencies,
    options: SePayPaymentProviderOptions
  ) {
    super(container, options)
    this.logger = container.logger
    this.sepayService = container.sepay
    this.options = options
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const sessionId = getRequiredSessionId(input.data)
    const amount = normalizeVndAmount(input.amount)
    validateCurrency(input.currency_code)
    const reusable = (await this.listAttemptsForSession(sessionId)).find(
      (attempt) =>
        Number(attempt.amount) === amount &&
        ["creating", "pending"].includes(attempt.status)
    )

    return reusable
      ? this.ensureQrDetails(reusable)
      : this.createPaymentAttempt(sessionId, amount)
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const sessionId = getRequiredSessionId(input.data)
    const amount = normalizeVndAmount(input.amount)
    validateCurrency(input.currency_code)
    const current = await this.getAttempt(asSessionData(input.data))

    if (
      current &&
      Number(current.amount) === amount &&
      ["creating", "pending", "paid"].includes(current.status)
    ) {
      return {
        data: toPublicSessionData(current),
        status: mapStatus(current.status),
      }
    }

    if (current && !isFinalStatus(current.status)) {
      await this.cancelAttempt(current, "Cart total changed")
    }

    return this.createPaymentAttempt(sessionId, amount)
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return {
      data: await this.cancelFromSession(
        asSessionData(input.data),
        "Payment method changed"
      ),
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const result = await this.getPaymentStatus(input)

    return { data: result.data, status: result.status }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const result = await this.getPaymentStatus(input)

    if (result.status !== PaymentSessionStatus.CAPTURED) {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        "SePay bank transfer has not been confirmed"
      )
    }

    return { data: result.data }
  }

  async refundPayment(
    _input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Automatic SePay refunds are not configured. Refund through the bank and record it in Medusa."
    )
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const attempt = await this.getRequiredAttempt(asSessionData(input.data))

    return { data: toPublicSessionData(attempt) }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return {
      data: await this.cancelFromSession(
        asSessionData(input.data),
        "Order cancelled"
      ),
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const { data } = await this.retrievePayment(input)

    return { data, status: mapStatus(data?.sepay_status) }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const body = parseBankWebhookBody(payload.data)
    const rawData =
      typeof payload.rawData === "string" || Buffer.isBuffer(payload.rawData)
        ? payload.rawData
        : JSON.stringify(payload.data)

    if (
      !verifySePayWebhookSignature({
        rawData,
        signature: getHeader(payload.headers, "x-sepay-signature"),
        timestamp: getHeader(payload.headers, "x-sepay-timestamp"),
        secret: this.options.webhookSecret,
      })
    ) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid SePay webhook signature"
      )
    }

    if (body.transferType.toLowerCase() !== "in") {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const invoiceNumber = findInvoiceNumber(body)

    if (!invoiceNumber) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const [attempt] = (await this.sepayService.listSepayPaymentAttempts({
      invoice_number: invoiceNumber,
    })) as SePayAttempt[]

    if (!attempt) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const amount = normalizeVndAmount(body.transferAmount)

    if (
      Number(attempt.amount) !== amount ||
      body.accountNumber !== this.options.bankAccount
    ) {
      await this.updateAttempt(attempt.id, {
        status: "failed",
        metadata: toWebhookMetadata(body),
      })
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SePay transfer amount or receiving account does not match the payment session"
      )
    }

    const updated = await this.updateAttempt(attempt.id, {
      status: "paid",
      transaction_id: body.referenceCode || String(body.id),
      metadata: toWebhookMetadata(body),
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
        session_id: updated.payment_session_id,
        amount: new BigNumber(amount),
      },
    }
  }

  private async createPaymentAttempt(sessionId: string, amount: number) {
    const attempt = (await this.sepayService.createSepayPaymentAttempts({
      payment_session_id: sessionId,
      invoice_number: createInvoiceNumber(),
      amount,
      currency_code: "vnd",
      payment_method: "BANK_TRANSFER",
      status: "creating",
    })) as SePayAttempt

    return this.ensureQrDetails(attempt)
  }

  private async ensureQrDetails(
    attempt: SePayAttempt
  ): Promise<InitiatePaymentOutput> {
    if (attempt.checkout_fields) {
      return toInitiatePaymentOutput(attempt)
    }

    const amount = normalizeVndAmount(attempt.amount)
    const updated = await this.updateAttempt(attempt.id, {
      status: "pending",
      checkout_fields: {
        qr_code_url: createSePayQrCodeUrl({
          bankAccount: this.options.bankAccount,
          bankCode: this.options.bankCode,
          amount,
          description: attempt.invoice_number,
          accountHolder: this.options.accountHolder,
          storeName: this.options.storeName,
        }),
        bank_account: this.options.bankAccount,
        bank_code: this.options.bankCode,
        account_holder: this.options.accountHolder ?? "",
        transfer_content: attempt.invoice_number,
        order_amount: amount,
      },
    })

    return toInitiatePaymentOutput(updated)
  }

  private async cancelFromSession(data: SePaySessionData, reason: string) {
    const attempt = await this.getAttempt(data)

    if (!attempt) {
      return data
    }

    if (attempt.status === "paid" || attempt.status === "cancelled") {
      return toPublicSessionData(attempt)
    }

    return toPublicSessionData(await this.cancelAttempt(attempt, reason))
  }

  private async cancelAttempt(attempt: SePayAttempt, reason: string) {
    return this.updateAttempt(attempt.id, {
      status: "cancelled",
      metadata: {
        ...(attempt.metadata ?? {}),
        cancellation_reason: reason,
      },
    })
  }

  private async listAttemptsForSession(sessionId: string) {
    return (await this.sepayService.listSepayPaymentAttempts(
      { payment_session_id: sessionId },
      { order: { created_at: "DESC" }, take: 20 }
    )) as SePayAttempt[]
  }

  private async getAttempt(data: SePaySessionData) {
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

function toInitiatePaymentOutput(attempt: SePayAttempt): InitiatePaymentOutput {
  return {
    id: attempt.invoice_number,
    status: mapStatus(attempt.status),
    data: toPublicSessionData(attempt),
  }
}

function toPublicSessionData(attempt: SePayAttempt): SePaySessionData {
  return {
    session_id: attempt.payment_session_id,
    invoice_number: attempt.invoice_number,
    ...(attempt.transaction_id
      ? { transaction_id: attempt.transaction_id }
      : {}),
    ...(attempt.checkout_fields
      ? { checkout_fields: toPublicFields(attempt.checkout_fields) }
      : {}),
    payment_method: "BANK_TRANSFER",
    sepay_status: attempt.status.toUpperCase(),
    amount: Number(attempt.amount),
  }
}

function toPublicFields(fields: Record<string, unknown>) {
  return Object.entries(fields).reduce<Record<string, string | number>>(
    (result, [key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        result[key] = value
      }

      return result
    },
    {}
  )
}

function mapStatus(status: unknown) {
  switch (String(status).toUpperCase()) {
    case "PAID":
    case "CAPTURED":
      return PaymentSessionStatus.CAPTURED
    case "CANCELLED":
      return PaymentSessionStatus.CANCELED
    case "FAILED":
      return PaymentSessionStatus.ERROR
    default:
      return PaymentSessionStatus.PENDING
  }
}

function parseBankWebhookBody(value: unknown): SePayBankWebhookBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid SePay bank webhook body"
    )
  }

  const body = value as Record<string, unknown>
  const transferAmount = Number(body.transferAmount)
  const accountNumber = readString(body.accountNumber)
  const transferType = readString(body.transferType)
  const gateway = readString(body.gateway)
  const id = body.id

  if (
    !Number.isSafeInteger(transferAmount) ||
    transferAmount <= 0 ||
    !accountNumber ||
    !transferType ||
    !gateway ||
    (typeof id !== "string" && typeof id !== "number")
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid SePay bank webhook fields"
    )
  }

  return {
    id,
    gateway,
    accountNumber,
    code: readString(body.code),
    content: readString(body.content),
    transferType,
    transferAmount,
    referenceCode: readString(body.referenceCode),
  }
}

function findInvoiceNumber(body: SePayBankWebhookBody) {
  for (const value of [body.code, body.content]) {
    const match = value?.toUpperCase().match(/TTV\d{16,20}/)

    if (match) {
      return match[0]
    }
  }

  return undefined
}

function toWebhookMetadata(body: SePayBankWebhookBody) {
  return {
    webhook_type: "bank_transfer",
    sepay_transaction_id: body.id,
    gateway: body.gateway,
    account_number: body.accountNumber,
    transfer_content: body.content,
    reference_code: body.referenceCode,
  }
}

function getRequiredSessionId(data?: Record<string, unknown>) {
  const sessionId = data?.session_id

  if (typeof sessionId !== "string" || !sessionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "SePay requires a Medusa payment session ID"
    )
  }

  return sessionId
}

function normalizeVndAmount(amount: unknown) {
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

function createInvoiceNumber() {
  return `TTV${Date.now()}${randomInt(1000, 10000)}`
}

function isFinalStatus(status: SePayAttemptStatus) {
  return ["paid", "cancelled", "failed"].includes(status)
}

function asSessionData(data: Record<string, unknown> | undefined) {
  return (data ?? {}) as SePaySessionData
}

function getHeader(headers: Record<string, unknown>, expectedName: string) {
  const value = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === expectedName.toLowerCase()
  )?.[1]

  return Array.isArray(value) ? value[0] : value
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export default SePayPaymentProviderService
