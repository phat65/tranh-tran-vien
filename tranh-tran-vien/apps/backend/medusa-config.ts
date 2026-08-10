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

module.exports = defineConfig({
  admin: {
    maxUploadFileSize: adminMaxUploadFileSize,
  },
  projectConfig: {
    databaseUrl: backendEnv.DATABASE_URL,
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
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              upload_dir: "static",
              backend_url: getStaticAssetBaseUrl(),
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/brand",
    },
    {
      resolve: "./src/modules/taxonomy",
    },
    {
      resolve: "./src/modules/navigation",
    },
    {
      resolve: "./src/modules/site-setting",
    },
    {
      resolve: "./src/modules/custom-design",
    },
    {
      resolve: "./src/modules/gift-rule",
    },
    {
      resolve: "./src/modules/shipping-rule",
    },
    {
      resolve: "./src/modules/combo-rule",
    },
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
