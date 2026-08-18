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
  it("keeps SePay disabled when credentials are empty", () => {
    const env = parseBackendEnv({
      ...baseEnv,
      SEPAY_ENVIRONMENT: "sandbox",
      SEPAY_MERCHANT_ID: "",
      SEPAY_SECRET_KEY: "",
      SEPAY_SUCCESS_URL:
        "http://localhost:8000/vn/checkout/sepay/return?result=success",
      SEPAY_ERROR_URL:
        "http://localhost:8000/vn/checkout/sepay/return?result=error",
      SEPAY_CANCEL_URL:
        "http://localhost:8000/vn/checkout/sepay/return?result=cancel",
    })

    expect(env.SEPAY_MERCHANT_ID).toBeUndefined()
    expect(env.SEPAY_SECRET_KEY).toBeUndefined()
  })

  it("accepts a complete SePay configuration", () => {
    const env = parseBackendEnv({
      ...baseEnv,
      SEPAY_ENVIRONMENT: "sandbox",
      SEPAY_MERCHANT_ID: "merchant-id",
      SEPAY_SECRET_KEY: "secret-key",
      SEPAY_SUCCESS_URL:
        "http://localhost:8000/vn/checkout/sepay/return?result=success",
      SEPAY_ERROR_URL:
        "http://localhost:8000/vn/checkout/sepay/return?result=error",
      SEPAY_CANCEL_URL:
        "http://localhost:8000/vn/checkout/sepay/return?result=cancel",
      SEPAY_PAYMENT_METHOD: "BANK_TRANSFER",
    })

    expect(env.SEPAY_ENVIRONMENT).toBe("sandbox")
    expect(env.SEPAY_PAYMENT_METHOD).toBe("BANK_TRANSFER")
  })

  it("requires callback URLs when SePay credentials are configured", () => {
    expect(() =>
      parseBackendEnv({
        ...baseEnv,
        SEPAY_ENVIRONMENT: "sandbox",
        SEPAY_MERCHANT_ID: "merchant-id",
        SEPAY_SECRET_KEY: "secret-key",
      })
    ).toThrow("SEPAY_SUCCESS_URL is required when SePay is configured")
  })
})
