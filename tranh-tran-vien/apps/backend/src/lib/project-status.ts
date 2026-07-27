export const PROJECT_NAME = "Tranh Tran Vien"
export const BACKEND_SERVICE_NAME = "commerce"

export const ACTIVE_FOUNDATION_MODULES = [
  "brand",
  "taxonomy",
  "navigation",
  "site-setting",
] as const

export const PLANNED_BACKEND_MODULES = [
  "custom-design",
  "gift-rule",
  "shipping-rule",
  "feedback",
  "content",
  "audit-log",
] as const

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
