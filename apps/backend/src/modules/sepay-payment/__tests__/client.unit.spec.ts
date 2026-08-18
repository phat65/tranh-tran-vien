import { SePayClient, verifySePayIpnSecret } from "../client"

describe("SePay client", () => {
  it("creates signed sandbox checkout fields without exposing the secret", () => {
    const client = new SePayClient({
      environment: "sandbox",
      merchantId: "MERCHANT_TEST",
      secretKey: "merchant-secret",
    })

    const checkout = client.createCheckout({
      invoiceNumber: "TTV123456",
      amount: 150000,
      description: "Thanh toan don hang TTV123456",
      paymentMethod: "BANK_TRANSFER",
      successUrl: "https://shop.example/success",
      errorUrl: "https://shop.example/error",
      cancelUrl: "https://shop.example/cancel",
    })

    expect(checkout.checkoutUrl).toBe(
      "https://pay-sandbox.sepay.vn/v1/checkout/init"
    )
    expect(checkout.fields).toEqual(
      expect.objectContaining({
        merchant: "MERCHANT_TEST",
        operation: "PURCHASE",
        payment_method: "BANK_TRANSFER",
        order_invoice_number: "TTV123456",
        order_amount: 150000,
        currency: "VND",
        signature: expect.any(String),
      })
    )
    expect(JSON.stringify(checkout.fields)).not.toContain("merchant-secret")
  })

  it("compares the IPN secret without accepting malformed values", () => {
    expect(verifySePayIpnSecret("merchant-secret", "merchant-secret")).toBe(
      true
    )
    expect(verifySePayIpnSecret("changed-secret", "merchant-secret")).toBe(
      false
    )
    expect(verifySePayIpnSecret(undefined, "merchant-secret")).toBe(false)
  })
})
