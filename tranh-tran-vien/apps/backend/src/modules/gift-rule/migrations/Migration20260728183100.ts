// Migration tạo hoặc cập nhật schema dữ liệu cho module gift rule.

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728183100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "gift_rule" ("id" text not null, "name" text not null, "scope_type" text check ("scope_type" in ('all', 'product', 'category', 'brand', 'taxonomy')) not null default 'all', "product_id" text null, "category_id" text null, "brand_id" text null, "taxonomy_term_id" text null, "minimum_quantity" integer not null default 1, "gift_variant_id" text not null, "gift_quantity" integer not null default 1, "starts_at" timestamptz null, "ends_at" timestamptz null, "priority" integer not null default 0, "is_stackable" boolean not null default false, "status" text check ("status" in ('draft', 'active', 'archived')) not null default 'draft', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "gift_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_rule_product_id" ON "gift_rule" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_rule_category_id" ON "gift_rule" ("category_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_rule_brand_id" ON "gift_rule" ("brand_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_rule_taxonomy_term_id" ON "gift_rule" ("taxonomy_term_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_rule_gift_variant_id" ON "gift_rule" ("gift_variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_rule_starts_at" ON "gift_rule" ("starts_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_rule_ends_at" ON "gift_rule" ("ends_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_rule_deleted_at" ON "gift_rule" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "gift_rule" cascade;`);
  }
}
