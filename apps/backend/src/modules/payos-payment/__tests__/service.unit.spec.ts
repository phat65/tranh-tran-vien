import { PaymentActions } from "@medusajs/framework/utils"

import { createPayOSDataSignature } from "../client"
import PayOSPaymentProviderService from "../service"

const options = {
  clientId: "client",
  apiKey: "api",
  checksumKey: "checksum",
  returnUrl: "https://shop.example/return",
  cancelUrl: "https://shop.example/cancel",
}

describe("PayOS webhook business rules", () => {
  it("does not complete the current cart from a cancelled payment link", async () => {
    const attempt = {
      id: "payosattempt_old",
      payment_session_id: "payses_current",
      order_code: "1712345678901",
      payment_link_id: "link_old",
      amount: 150000,
      currency_code: "vnd",
      status: "cancelled" as const,
    }
    const payos = {
      listPayosPaymentAttempts: jest.fn().mockResolvedValue([attempt]),
      updatePayosPaymentAttempts: jest
        .fn()
        .mockImplementation(async (data) => ({ ...attempt, ...data })),
    }
    const logger = { error: jest.fn() }
    const provider = new PayOSPaymentProviderService(
      { logger, payos } as never,
      options
    )
    const data = {
      orderCode: Number(attempt.order_code),
      amount: attempt.amount,
      reference: "FT_CANCELLED",
      paymentLinkId: attempt.payment_link_id,
    }

    const result = await provider.getWebhookActionAndData({
      data: {
        code: "00",
        desc: "success",
        success: true,
        data,
        signature: createPayOSDataSignature(data, options.checksumKey),
      },
      rawData: JSON.stringify(data),
      headers: {},
    })

    expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
    expect(payos.updatePayosPaymentAttempts).toHaveBeenCalledWith(
      expect.objectContaining({ id: attempt.id, status: "paid" })
    )
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
