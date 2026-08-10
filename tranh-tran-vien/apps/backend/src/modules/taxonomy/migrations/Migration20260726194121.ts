// Migration tạo hoặc cập nhật schema dữ liệu cho module taxonomy.

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260726194121 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "taxonomy_term" drop constraint if exists "taxonomy_term_slug_unique";`);
    this.addSql(`alter table if exists "taxonomy" drop constraint if exists "taxonomy_code_unique";`);
    this.addSql(`create table if not exists "taxonomy" ("id" text not null, "code" text not null, "name" text not null, "description" text null, "status" text check ("status" in ('draft', 'active', 'archived')) not null default 'draft', "sort_order" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "taxonomy_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_taxonomy_code_unique" ON "taxonomy" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_taxonomy_deleted_at" ON "taxonomy" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "taxonomy_term" ("id" text not null, "taxonomy_id" text not null, "parent_id" text null, "name" text not null, "slug" text not null, "image_url" text null, "description" text null, "status" text check ("status" in ('draft', 'active', 'archived')) not null default 'draft', "sort_order" integer not null default 0, "seo_title" text null, "seo_description" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "taxonomy_term_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_taxonomy_term_taxonomy_id" ON "taxonomy_term" ("taxonomy_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_taxonomy_term_parent_id" ON "taxonomy_term" ("parent_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_taxonomy_term_slug_unique" ON "taxonomy_term" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_taxonomy_term_deleted_at" ON "taxonomy_term" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "taxonomy" cascade;`);

    this.addSql(`drop table if exists "taxonomy_term" cascade;`);
  }

}
