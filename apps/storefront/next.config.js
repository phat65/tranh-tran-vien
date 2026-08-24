// Cấu hình Next.js của storefront, gồm compiler, image domain và option build/runtime.

const path = require("path")
const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME
const STORAGE_PUBLIC_URL =
  process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ||
  process.env.S3_PUBLIC_BASE_URL ||
  process.env.S3_FILE_URL
const storageRemotePattern = toRemotePattern(STORAGE_PUBLIC_URL)

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    unoptimized: true,
    qualities: [80],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
      ...(storageRemotePattern ? [storageRemotePattern] : []),
    ],
  },
}

module.exports = nextConfig

function toRemotePattern(value) {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)

    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      pathname: `${url.pathname.replace(/\/$/, "")}/**`,
    }
  } catch {
    return null
  }
}
