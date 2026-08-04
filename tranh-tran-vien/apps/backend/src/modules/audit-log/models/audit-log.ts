import { model } from "@medusajs/framework/utils"

const AuditLog = model.define("audit_log", {
  id: model.id({ prefix: "audit" }).primaryKey(),
  actor_id: model.text().index().nullable(),
  actor_type: model.enum(["admin", "customer", "system"]).default("system"),
  action: model.text().index(),
  entity_type: model.text().index(),
  entity_id: model.text().index().nullable(),
  request_id: model.text().index().nullable(),
  before_json: model.json().nullable(),
  after_json: model.json().nullable(),
  metadata: model.json().nullable(),
})

export default AuditLog
