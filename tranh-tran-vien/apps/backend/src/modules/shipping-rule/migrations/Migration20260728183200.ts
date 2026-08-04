import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728183200 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "shipping_rule" ("id" text not null, "name" text not null, "scope_type" text check ("scope_type" in ('all', 'product', 'category', 'brand', 'taxonomy')) not null default 'all', "product_id" text null, "category_id" text null, "brand_id" text null, "taxonomy_term_id" text null, "minimum_quantity" integer not null default 1, "maximum_quantity" integer null, "shipping_fee" integer not null default 0, "is_free_shipping" boolean not null default false, "starts_at" timestamptz null, "ends_at" timestamptz null, "priority" integer not null default 0, "status" text check ("status" in ('draft', 'active', 'archived')) not null default 'draft', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipping_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_rule_product_id" ON "shipping_rule" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_rule_category_id" ON "shipping_rule" ("category_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_rule_brand_id" ON "shipping_rule" ("brand_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_rule_taxonomy_term_id" ON "shipping_rule" ("taxonomy_term_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_rule_starts_at" ON "shipping_rule" ("starts_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_rule_ends_at" ON "shipping_rule" ("ends_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_rule_deleted_at" ON "shipping_rule" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shipping_rule" cascade;`);
  }
}
