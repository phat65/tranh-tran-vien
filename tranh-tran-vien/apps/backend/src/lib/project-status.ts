// Helper backend xử lý project status dùng lại giữa API, module và script.

export const PROJECT_NAME = "Tranh Tran Vien"
export const BACKEND_SERVICE_NAME = "commerce"

export const ACTIVE_FOUNDATION_MODULES = [
  "brand",
  "taxonomy",
  "navigation",
  "site-setting",
  "custom-design",
  "gift-rule",
  "shipping-rule",
  "combo-rule",
  "feedback",
  "content",
  "audit-log",
  "wishlist",
] as const

export const PLANNED_BACKEND_MODULES = [] as const

export function getBackendStatus() {
  return {
    status: "ok",
    service: BACKEND_SERVICE_NAME,
    project: PROJECT_NAME,
    modules: {
      active: ACTIVE_FOUNDATION_MODULES,
      planned: PLANNED_BACKEND_MODULES,
    },
  }
}
