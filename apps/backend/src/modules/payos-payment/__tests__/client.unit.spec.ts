import {
  createPayOSDataSignature,
  createPayOSPaymentRequestSignature,
  verifyPayOSDataSignature,
} from "../client"

const checksumKey = "test-checksum-key"

describe("PayOS signatures", () => {
  it("creates the payment-link signature in PayOS field order", () => {
    expect(
      createPayOSPaymentRequestSignature(
        {
          amount: 150000,
          cancelUrl: "https://shop.example/cancel",
          description: "TTV123456",
          orderCode: 1712345678901,
          returnUrl: "https://shop.example/return",
        },
        checksumKey
      )
    ).toBe("4994b60261b1c3ac9b2fb4c0642b165db0fa1c29d13536dbb49efa0de5e23763")
  })

  it("verifies a signed webhook and rejects changed payment data", () => {
    const data = {
      orderCode: 1712345678901,
      amount: 150000,
      description: "TTV123456",
      accountNumber: "123456789",
      reference: "FT123",
      transactionDateTime: "2026-08-17 12:00:00",
      currency: "VND",
      paymentLinkId: "link_123",
      code: "00",
      desc: "success",
      counterAccountBankId: null,
    }
    const signature =
      "908f9ff569eb70edaefe4e2e8db4e60c47f543c6b4f0b306760f95872cee973d"

    expect(createPayOSDataSignature(data, checksumKey)).toBe(signature)
    expect(verifyPayOSDataSignature(data, signature, checksumKey)).toBe(true)
    expect(
      verifyPayOSDataSignature(
        { ...data, amount: data.amount + 1 },
        signature,
        checksumKey
      )
    ).toBe(false)
  })

  it("rejects malformed signatures before timing-safe comparison", () => {
    expect(verifyPayOSDataSignature({ amount: 1 }, "invalid", checksumKey)).toBe(
      false
    )
  })
})
