// Migration tạo hoặc cập nhật schema dữ liệu cho module gift rule.

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260729120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "gift_rule" add column if not exists "collection_id" text null;`);
    this.addSql(`alter table if exists "gift_rule" drop constraint if exists "gift_rule_scope_type_check";`);
    this.addSql(`alter table if exists "gift_rule" add constraint "gift_rule_scope_type_check" check ("scope_type" in ('all', 'product', 'category', 'collection', 'brand', 'taxonomy'));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_rule_collection_id" ON "gift_rule" ("collection_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_gift_rule_collection_id";`);
    this.addSql(`alter table if exists "gift_rule" drop constraint if exists "gift_rule_scope_type_check";`);
    this.addSql(`alter table if exists "gift_rule" add constraint "gift_rule_scope_type_check" check ("scope_type" in ('all', 'product', 'category', 'brand', 'taxonomy'));`);
    this.addSql(`alter table if exists "gift_rule" drop column if exists "collection_id";`);
  }
}
