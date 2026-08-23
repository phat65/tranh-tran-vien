import { createHmac } from "node:crypto"

import { createSePayQrCodeUrl, verifySePayWebhookSignature } from "../client"

describe("SePay direct QR helpers", () => {
  it("builds a VietQR URL without exposing webhook credentials", () => {
    const result = createSePayQrCodeUrl({
      bankAccount: "0123456789",
      bankCode: "Vietcombank",
      amount: 150000,
      description: "TTV1234567890123456",
      accountHolder: "TRANH TRAN VIEN",
    })
    const url = new URL(result)

    expect(url.origin).toBe("https://vietqr.app")
    expect(url.pathname).toBe("/img")
    expect(url.searchParams.get("acc")).toBe("0123456789")
    expect(url.searchParams.get("bank")).toBe("Vietcombank")
    expect(url.searchParams.get("amount")).toBe("150000")
    expect(url.searchParams.get("des")).toBe("TTV1234567890123456")
  })

  it("accepts a valid webhook signature and rejects stale requests", () => {
    const rawData = JSON.stringify({ id: 1, transferAmount: 150000 })
    const timestamp = "1787392800"
    const secret = "webhook-secret"
    const signature = `sha256=${createHmac("sha256", secret)
      .update(`${timestamp}.${rawData}`)
      .digest("hex")}`

    expect(
      verifySePayWebhookSignature({
        rawData,
        signature,
        timestamp,
        secret,
        now: Number(timestamp) * 1000,
      })
    ).toBe(true)
    expect(
      verifySePayWebhookSignature({
        rawData,
        signature,
        timestamp,
        secret,
        now: (Number(timestamp) + 301) * 1000,
      })
    ).toBe(false)
  })
})
