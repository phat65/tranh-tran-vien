import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260726194120 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop constraint if exists "brand_slug_unique";`);
    this.addSql(`create table if not exists "brand" ("id" text not null, "name" text not null, "slug" text not null, "parent_id" text null, "logo_url" text null, "description" text null, "status" text check ("status" in ('draft', 'active', 'archived')) not null default 'draft', "sort_order" integer not null default 0, "seo_title" text null, "seo_description" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_slug_unique" ON "brand" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_parent_id" ON "brand" ("parent_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" ON "brand" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "brand" cascade;`);
  }

}
