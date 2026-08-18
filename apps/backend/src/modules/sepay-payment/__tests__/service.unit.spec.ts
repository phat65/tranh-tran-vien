import { PaymentActions } from "@medusajs/framework/utils"

import SePayPaymentProviderService from "../service"

const options = {
  environment: "sandbox" as const,
  merchantId: "MERCHANT_TEST",
  secretKey: "merchant-secret",
  successUrl: "https://shop.example/success",
  errorUrl: "https://shop.example/error",
  cancelUrl: "https://shop.example/cancel",
  paymentMethod: "BANK_TRANSFER" as const,
}

const pendingAttempt = {
  id: "sepayattempt_01",
  payment_session_id: "payses_current",
  invoice_number: "TTV123456",
  amount: 150000,
  currency_code: "vnd",
  payment_method: "BANK_TRANSFER" as const,
  status: "pending" as const,
}

const paidIpn = {
  timestamp: 1786957200,
  notification_type: "ORDER_PAID",
  order: {
    id: "order_internal_01",
    order_id: "SEPAY-ORDER-01",
    order_status: "CAPTURED",
    order_currency: "VND",
    order_amount: "150000.00",
    order_invoice_number: pendingAttempt.invoice_number,
  },
  transaction: {
    id: "transaction_internal_01",
    transaction_id: "FT_SEPAY_01",
    transaction_status: "APPROVED",
    transaction_amount: "150000",
    transaction_currency: "VND",
  },
  customer: {},
}

describe("SePay payment provider", () => {
  it("creates and persists checkout form fields for a new payment session", async () => {
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
        session_id: pendingAttempt.payment_session_id,
        checkout_url: "https://pay-sandbox.sepay.vn/v1/checkout/init",
        checkout_fields: expect.objectContaining({
          signature: expect.any(String),
          order_amount: 150000,
        }),
      })
    )
    expect(sepay.updateSepayPaymentAttempts).toHaveBeenCalledWith(
      expect.objectContaining({
        id: pendingAttempt.id,
        status: "pending",
        checkout_fields: expect.any(Object),
      })
    )
  })

  it("rejects an IPN with the wrong secret", async () => {
    const provider = new SePayPaymentProviderService(
      {
        logger: { error: jest.fn() },
        sepay: { listSepayPaymentAttempts: jest.fn() },
      } as never,
      options
    )

    await expect(
      provider.getWebhookActionAndData({
        data: paidIpn,
        rawData: JSON.stringify(paidIpn),
        headers: { "x-secret-key": "wrong-secret" },
      })
    ).rejects.toThrow("Invalid SePay IPN secret")
  })

  it("captures the matching Medusa payment session from a paid IPN", async () => {
    const sepay = {
      listSepayPaymentAttempts: jest.fn().mockResolvedValue([pendingAttempt]),
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

    const result = await provider.getWebhookActionAndData({
      data: paidIpn,
      rawData: JSON.stringify(paidIpn),
      headers: { "x-secret-key": options.secretKey },
    })

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
        sepay_order_id: paidIpn.order.order_id,
        transaction_id: paidIpn.transaction.transaction_id,
      })
    )
  })

  it("does not complete the current cart from a cancelled SePay attempt", async () => {
    const attempt = { ...pendingAttempt, status: "cancelled" as const }
    const sepay = {
      listSepayPaymentAttempts: jest.fn().mockResolvedValue([attempt]),
      updateSepayPaymentAttempts: jest
        .fn()
        .mockImplementation(async (data) => ({ ...attempt, ...data })),
    }
    const logger = { error: jest.fn() }
    const provider = new SePayPaymentProviderService(
      { logger, sepay } as never,
      options
    )

    const result = await provider.getWebhookActionAndData({
      data: paidIpn,
      rawData: JSON.stringify(paidIpn),
      headers: { "X-Secret-Key": options.secretKey },
    })

    expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
    expect(sepay.updateSepayPaymentAttempts).toHaveBeenCalledWith(
      expect.objectContaining({
        id: attempt.id,
        status: "paid",
        transaction_id: paidIpn.transaction.transaction_id,
      })
    )
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
