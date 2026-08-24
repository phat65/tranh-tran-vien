import { PaymentActions } from "@medusajs/framework/utils"
import { createHmac } from "node:crypto"

import SePayPaymentProviderService from "../service"

const options = {
  bankAccount: "0123456789",
  bankCode: "Vietcombank",
  accountHolder: "TRANH TRAN VIEN",
  webhookSecret: "webhook-secret",
}

const pendingAttempt = {
  id: "sepayattempt_01",
  payment_session_id: "payses_current",
  invoice_number: "TTV1234567890123456",
  amount: 150000,
  currency_code: "vnd",
  payment_method: "BANK_TRANSFER" as const,
  status: "pending" as const,
}

function createWebhook(overrides: Record<string, unknown> = {}) {
  const data = {
    id: 92704,
    gateway: options.bankCode,
    accountNumber: options.bankAccount,
    code: pendingAttempt.invoice_number,
    content: `${pendingAttempt.invoice_number} chuyen tien`,
    transferType: "in",
    transferAmount: 150000,
    referenceCode: "FT24012345678",
    ...overrides,
  }
  const rawData = JSON.stringify(data)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = `sha256=${createHmac("sha256", options.webhookSecret)
    .update(`${timestamp}.${rawData}`)
    .digest("hex")}`

  return {
    data,
    rawData,
    headers: {
      "x-sepay-signature": signature,
      "x-sepay-timestamp": timestamp,
    },
  }
}

describe("SePay direct QR payment provider", () => {
  it("creates and persists an inline QR payment session", async () => {
    const sepay = {
      listSepayPaymentAttempts: jest.fn().mockResolvedValue([]),
      createSepayPaymentAttempts: jest
        .fn()
        .mockImplementation(async (data) => ({
          ...pendingAttempt,
          ...data,
          status: "creating",
        })),
      updateSepayPaymentAttempts: jest
        .fn()
        .mockImplementation(async (data) => ({
          ...pendingAttempt,
          ...data,
        })),
    }
    const provider = new SePayPaymentProviderService(
      { logger: { error: jest.fn() }, sepay } as never,
      options
    )

    const result = await provider.initiatePayment({
      amount: 150000,
      currency_code: "vnd",
      data: { session_id: pendingAttempt.payment_session_id },
    } as never)

    expect(result.status).toBe("pending")
    expect(result.data).toEqual(
      expect.objectContaining({
        checkout_fields: expect.objectContaining({
          qr_code_url: expect.stringContaining("https://vietqr.app/img?"),
          bank_account: options.bankAccount,
          transfer_content: expect.stringMatching(/^TTV\d{16,20}$/),
          order_amount: 150000,
        }),
      })
    )
    expect(result.data?.checkout_url).toBeUndefined()
  })

  it("rejects a bank webhook with an invalid HMAC signature", async () => {
    const provider = new SePayPaymentProviderService(
      {
        logger: { error: jest.fn() },
        sepay: { listSepayPaymentAttempts: jest.fn() },
      } as never,
      options
    )
    const webhook = createWebhook()

    await expect(
      provider.getWebhookActionAndData({
        ...webhook,
        headers: {
          ...webhook.headers,
          "x-sepay-signature": "sha256=invalid",
        },
      })
    ).rejects.toThrow("Invalid SePay webhook signature")
  })

  it("captures the matching session from a signed incoming bank webhook", async () => {
    const sepay = {
      listSepayPaymentAttempts: jest.fn().mockResolvedValue([pendingAttempt]),
      updateSepayPaymentAttempts: jest
        .fn()
        .mockImplementation(async (data) => ({ ...pendingAttempt, ...data })),
    }
    const provider = new SePayPaymentProviderService(
      { logger: { error: jest.fn() }, sepay } as never,
      options
    )
    const webhook = createWebhook()

    const result = await provider.getWebhookActionAndData(webhook)

    expect(result.action).toBe(PaymentActions.SUCCESSFUL)
    expect(result.data).toEqual(
      expect.objectContaining({
        session_id: pendingAttempt.payment_session_id,
      })
    )
    expect(sepay.updateSepayPaymentAttempts).toHaveBeenCalledWith(
      expect.objectContaining({
        id: pendingAttempt.id,
        status: "paid",
        transaction_id: webhook.data.referenceCode,
      })
    )
  })

  it("rejects a signed transfer with a different amount or account", async () => {
    const sepay = {
      listSepayPaymentAttempts: jest.fn().mockResolvedValue([pendingAttempt]),
      updateSepayPaymentAttempts: jest.fn().mockResolvedValue(pendingAttempt),
    }
    const provider = new SePayPaymentProviderService(
      { logger: { error: jest.fn() }, sepay } as never,
      options
    )

    await expect(
      provider.getWebhookActionAndData(
        createWebhook({ transferAmount: 149000 })
      )
    ).rejects.toThrow(
      "SePay transfer amount or receiving account does not match"
    )
    expect(sepay.updateSepayPaymentAttempts).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    )
  })
})
