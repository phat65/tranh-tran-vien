// Helper backend xử lý env dùng lại giữa API, module và script.

import { z } from "@medusajs/framework/zod"

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional()
)
const optionalPositiveNumber = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().positive().optional()
)
const optionalBooleanString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["true", "false"]).optional()
)

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
  REDIS_URL: optionalString,
  S3_ENDPOINT: optionalString,
  S3_REGION: optionalString,
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_FILE_URL: optionalString,
  S3_PUBLIC_BASE_URL: optionalString,
  S3_PREFIX: optionalString,
  S3_CACHE_CONTROL: optionalString,
  S3_DOWNLOAD_FILE_DURATION: optionalPositiveNumber,
  S3_FORCE_PATH_STYLE: optionalBooleanString,
}).superRefine((env, ctx) => {
  const hasS3Value = [
    env.S3_ENDPOINT,
    env.S3_BUCKET,
    env.S3_ACCESS_KEY_ID,
    env.S3_SECRET_ACCESS_KEY,
    env.S3_FILE_URL,
    env.S3_PUBLIC_BASE_URL,
  ].some(Boolean)

  if (!hasS3Value) {
    return
  }

  const requiredFields = [
    "S3_ENDPOINT",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  ] as const

  for (const field of requiredFields) {
    if (!env[field]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} is required when S3/R2 storage is configured`,
      })
    }
  }

  if (!env.S3_FILE_URL && !env.S3_PUBLIC_BASE_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["S3_FILE_URL"],
      message:
        "S3_FILE_URL or S3_PUBLIC_BASE_URL is required when S3/R2 storage is configured",
    })
  }
})

export type BackendEnv = z.infer<typeof backendEnvSchema>

export function parseBackendEnv(env: NodeJS.ProcessEnv): BackendEnv {
  return backendEnvSchema.parse(env)
}
