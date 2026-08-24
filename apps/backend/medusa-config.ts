// Cấu hình Medusa backend: database, CORS, module, plugin và file provider.

import { loadEnv, defineConfig } from "@medusajs/framework/utils"

import { parseBackendEnv } from "./src/lib/env"
import { getStaticAssetBaseUrl } from "./src/lib/static-assets"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const backendEnv = parseBackendEnv(process.env)
const defaultAdminMaxUploadFileSize = 50 * 1024 * 1024
const configuredAdminMaxUploadFileSize = Number.parseInt(
  process.env.MEDUSA_ADMIN_MAX_UPLOAD_FILE_SIZE ?? "",
  10
)
const adminMaxUploadFileSize = Number.isFinite(configuredAdminMaxUploadFileSize)
  ? configuredAdminMaxUploadFileSize
  : defaultAdminMaxUploadFileSize
const s3FileUrl = backendEnv.S3_FILE_URL ?? backendEnv.S3_PUBLIC_BASE_URL
const useS3FileProvider = Boolean(
  s3FileUrl &&
  backendEnv.S3_ENDPOINT &&
  backendEnv.S3_BUCKET &&
  backendEnv.S3_ACCESS_KEY_ID &&
  backendEnv.S3_SECRET_ACCESS_KEY
)
const usePayOSPaymentProvider = Boolean(
  backendEnv.PAYOS_CLIENT_ID &&
  backendEnv.PAYOS_API_KEY &&
  backendEnv.PAYOS_CHECKSUM_KEY &&
  backendEnv.PAYOS_RETURN_URL &&
  backendEnv.PAYOS_CANCEL_URL
)
const useSePayPaymentProvider = Boolean(
  backendEnv.SEPAY_BANK_ACCOUNT &&
  backendEnv.SEPAY_BANK_CODE &&
  backendEnv.SEPAY_WEBHOOK_SECRET
)
const paymentProviders: Array<{
  resolve: string
  id: string
  options: Record<string, unknown>
}> = []
const paymentProviderDependencies: string[] = []

if (usePayOSPaymentProvider) {
  paymentProviderDependencies.push("payos")
  paymentProviders.push({
    resolve: "./src/modules/payos-payment",
    id: "payos",
    options: {
      clientId: backendEnv.PAYOS_CLIENT_ID,
      apiKey: backendEnv.PAYOS_API_KEY,
      checksumKey: backendEnv.PAYOS_CHECKSUM_KEY,
      returnUrl: backendEnv.PAYOS_RETURN_URL,
      cancelUrl: backendEnv.PAYOS_CANCEL_URL,
      apiUrl: backendEnv.PAYOS_API_URL,
      partnerCode: backendEnv.PAYOS_PARTNER_CODE,
    },
  })
}

if (useSePayPaymentProvider) {
  paymentProviderDependencies.push("sepay")
  paymentProviders.push({
    resolve: "./src/modules/sepay-payment",
    id: "sepay",
    options: {
      bankAccount: backendEnv.SEPAY_BANK_ACCOUNT,
      bankCode: backendEnv.SEPAY_BANK_CODE,
      accountHolder: backendEnv.SEPAY_ACCOUNT_HOLDER,
      storeName: backendEnv.SEPAY_STORE_NAME,
      webhookSecret: backendEnv.SEPAY_WEBHOOK_SECRET,
    },
  })
}
const s3FileProviderOptions: Record<string, unknown> = {
  file_url: s3FileUrl,
  access_key_id: backendEnv.S3_ACCESS_KEY_ID,
  secret_access_key: backendEnv.S3_SECRET_ACCESS_KEY,
  region: backendEnv.S3_REGION ?? "auto",
  bucket: backendEnv.S3_BUCKET,
  endpoint: backendEnv.S3_ENDPOINT,
}

if (backendEnv.S3_PREFIX) {
  s3FileProviderOptions.prefix = backendEnv.S3_PREFIX
}

if (backendEnv.S3_CACHE_CONTROL) {
  s3FileProviderOptions.cache_control = backendEnv.S3_CACHE_CONTROL
}

if (backendEnv.S3_DOWNLOAD_FILE_DURATION) {
  s3FileProviderOptions.download_file_duration =
    backendEnv.S3_DOWNLOAD_FILE_DURATION
}

if (backendEnv.S3_FORCE_PATH_STYLE === "true") {
  s3FileProviderOptions.additional_client_config = {
    forcePathStyle: true,
  }
}

const fileProvider = useS3FileProvider
  ? {
      resolve: "@medusajs/medusa/file-s3",
      id: "s3",
      options: s3FileProviderOptions,
    }
  : {
      resolve: "@medusajs/medusa/file-local",
      id: "local",
      options: {
        upload_dir: "static",
        backend_url: getStaticAssetBaseUrl(),
      },
    }

module.exports = defineConfig({
  admin: {
    maxUploadFileSize: adminMaxUploadFileSize,
  },
  projectConfig: {
    databaseUrl: backendEnv.DATABASE_URL,
    databaseDriverOptions: {
      connection: {
        ssl: false,
      },
    },
    redisUrl: backendEnv.REDIS_URL,
    http: {
      storeCors: backendEnv.STORE_CORS,
      adminCors: backendEnv.ADMIN_CORS,
      authCors: backendEnv.AUTH_CORS,
      jwtSecret: backendEnv.JWT_SECRET,
      cookieSecret: backendEnv.COOKIE_SECRET,
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [fileProvider],
      },
    },
    {
      resolve: "./src/modules/brand",
    },
    {
      resolve: "./src/modules/site-setting",
    },
    {
      resolve: "./src/modules/custom-design",
    },
    {
      resolve: "./src/modules/payos",
    },
    {
      resolve: "./src/modules/sepay",
    },
    ...(paymentProviders.length
      ? [
          {
            resolve: "@medusajs/medusa/payment",
            dependencies: paymentProviderDependencies,
            options: {
              providers: paymentProviders,
            },
          },
        ]
      : []),
    {
      resolve: "./src/modules/feedback",
    },
    {
      resolve: "./src/modules/content",
    },
    {
      resolve: "./src/modules/audit-log",
    },
    {
      resolve: "./src/modules/wishlist",
    },
  ],
})
