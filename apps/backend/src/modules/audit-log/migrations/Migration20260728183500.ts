// Migration tạo hoặc cập nhật schema dữ liệu cho module audit log.

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728183500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "audit_log" ("id" text not null, "actor_id" text null, "actor_type" text check ("actor_type" in ('admin', 'customer', 'system')) not null default 'system', "action" text not null, "entity_type" text not null, "entity_id" text null, "request_id" text null, "before_json" jsonb null, "after_json" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "audit_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_actor_id" ON "audit_log" ("actor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_action" ON "audit_log" ("action") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_entity_type" ON "audit_log" ("entity_type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_entity_id" ON "audit_log" ("entity_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_request_id" ON "audit_log" ("request_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_deleted_at" ON "audit_log" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "audit_log" cascade;`);
  }
}
