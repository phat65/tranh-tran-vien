import { MedusaService } from "@medusajs/framework/utils"

import AuditLog from "./models/audit-log"

type AuditActorType = "admin" | "customer" | "system"

type AuditLogInput = {
  actor_id?: string | null
  actor_type?: AuditActorType
  action: string
  entity_type: string
  entity_id?: string | null
  request_id?: string | null
  before_json?: Record<string, unknown> | null
  after_json?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

class AuditLogModuleService extends MedusaService({
  AuditLog,
}) {
  async recordAuditLog(input: AuditLogInput) {
    return this.createAuditLogs({
      actor_id: input.actor_id ?? null,
      actor_type: input.actor_type ?? "system",
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      request_id: input.request_id ?? null,
      before_json: input.before_json ?? null,
      after_json: input.after_json ?? null,
      metadata: input.metadata ?? null,
    })
  }
}

export default AuditLogModuleService
