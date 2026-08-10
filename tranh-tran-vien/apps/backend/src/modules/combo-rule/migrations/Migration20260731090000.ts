// Migration tạo hoặc cập nhật schema dữ liệu cho module combo rule.

import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260731090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "combo_rule" ("id" text not null, "name" text not null, "description" text null, "scope_type" text check ("scope_type" in ('all', 'product', 'category', 'collection', 'option')) not null default 'collection', "product_id" text null, "category_id" text null, "collection_id" text null, "option_value_id" text null, "sales_channel_id" text null, "region_id" text null, "tiers" jsonb not null, "priority" integer not null default 0, "is_stackable" boolean not null default false, "starts_at" timestamptz null, "ends_at" timestamptz null, "status" text check ("status" in ('draft', 'active', 'archived')) not null default 'draft', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "combo_rule_pkey" primary key ("id"));`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_combo_rule_product_id" ON "combo_rule" ("product_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_combo_rule_category_id" ON "combo_rule" ("category_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_combo_rule_collection_id" ON "combo_rule" ("collection_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_combo_rule_option_value_id" ON "combo_rule" ("option_value_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_combo_rule_sales_channel_id" ON "combo_rule" ("sales_channel_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_combo_rule_region_id" ON "combo_rule" ("region_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_combo_rule_starts_at" ON "combo_rule" ("starts_at") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_combo_rule_ends_at" ON "combo_rule" ("ends_at") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_combo_rule_deleted_at" ON "combo_rule" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "combo_rule" cascade;`)
  }
}
