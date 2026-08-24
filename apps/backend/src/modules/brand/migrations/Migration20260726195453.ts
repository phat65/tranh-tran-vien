// Migration tạo hoặc cập nhật schema dữ liệu cho module brand.

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260726195453 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_brand" ("id" text not null, "product_id" text not null, "brand_id" text not null, "is_primary" boolean not null default false, "sort_order" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_brand_product_id" ON "product_brand" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_brand_brand_id" ON "product_brand" ("brand_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_brand_deleted_at" ON "product_brand" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_brand_product_brand_unique" ON "product_brand" ("product_id", "brand_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_brand_primary_unique" ON "product_brand" ("product_id") WHERE is_primary = true AND deleted_at IS NULL;`);
    this.addSql(`alter table if exists "product_brand" add constraint "product_brand_brand_id_foreign" foreign key ("brand_id") references "brand" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_brand" cascade;`);
  }

}
