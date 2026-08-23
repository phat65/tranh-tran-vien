import { parseBackendEnv } from "../env"

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/test",
  STORE_CORS: "http://localhost:8000",
  ADMIN_CORS: "http://localhost:9000",
  AUTH_CORS: "http://localhost:9000",
  JWT_SECRET: "test-jwt-secret",
  COOKIE_SECRET: "test-cookie-secret",
}

describe("parseBackendEnv SePay configuration", () => {
  it("keeps SePay disabled when direct QR settings are empty", () => {
    const env = parseBackendEnv({
      ...baseEnv,
      SEPAY_BANK_ACCOUNT: "",
      SEPAY_BANK_CODE: "",
      SEPAY_WEBHOOK_SECRET: "",
    })

    expect(env.SEPAY_BANK_ACCOUNT).toBeUndefined()
    expect(env.SEPAY_WEBHOOK_SECRET).toBeUndefined()
  })

  it("accepts a complete direct QR configuration", () => {
    const env = parseBackendEnv({
      ...baseEnv,
      SEPAY_BANK_ACCOUNT: "0123456789",
      SEPAY_BANK_CODE: "Vietcombank",
      SEPAY_WEBHOOK_SECRET: "webhook-secret",
    })

    expect(env.SEPAY_BANK_CODE).toBe("Vietcombank")
  })

  it("requires all critical direct QR settings", () => {
    expect(() =>
      parseBackendEnv({
        ...baseEnv,
        SEPAY_BANK_ACCOUNT: "0123456789",
      })
    ).toThrow("SEPAY_BANK_CODE is required for inline SePay QR payments")
  })
})
