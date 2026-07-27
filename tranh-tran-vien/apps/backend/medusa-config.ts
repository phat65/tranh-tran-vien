import { loadEnv, defineConfig } from "@medusajs/framework/utils"

import { parseBackendEnv } from "./src/lib/env"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const backendEnv = parseBackendEnv(process.env)

module.exports = defineConfig({
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
  ],
})
