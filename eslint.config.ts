// Cấu hình ESLint dùng chung để kiểm tra chất lượng code trong workspace.

import { defineConfig } from "eslint/config"
import medusa from "@medusajs/eslint-plugin"

export default defineConfig([...medusa.configs.recommended])
