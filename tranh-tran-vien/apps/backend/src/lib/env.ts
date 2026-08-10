// Helper backend xử lý env dùng lại giữa API, module và script.

import { z } from "@medusajs/framework/zod"

const backendEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  STORE_CORS: z.string().min(1, "STORE_CORS is required"),
  ADMIN_CORS: z.string().min(1, "ADMIN_CORS is required"),
  AUTH_CORS: z.string().min(1, "AUTH_CORS is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  COOKIE_SECRET: z.string().min(1, "COOKIE_SECRET is required"),
  REDIS_URL: z.string().optional(),
})

export type BackendEnv = z.infer<typeof backendEnvSchema>

export function parseBackendEnv(env: NodeJS.ProcessEnv): BackendEnv {
  return backendEnvSchema.parse(env)
}
