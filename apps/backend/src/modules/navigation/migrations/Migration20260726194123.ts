// Migration tạo hoặc cập nhật schema dữ liệu cho module navigation.

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260726194123 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "navigation_menu" drop constraint if exists "navigation_menu_code_unique";`);
    this.addSql(`create table if not exists "navigation_item" ("id" text not null, "menu_id" text not null, "parent_id" text null, "label" text not null, "link_type" text check ("link_type" in ('url', 'product', 'category', 'brand', 'taxonomy', 'page', 'post')) not null default 'url', "entity_id" text null, "url" text null, "image_url" text null, "sort_order" integer not null default 0, "visibility" text check ("visibility" in ('visible', 'hidden')) not null default 'visible', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "navigation_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_navigation_item_menu_id" ON "navigation_item" ("menu_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_navigation_item_parent_id" ON "navigation_item" ("parent_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_navigation_item_entity_id" ON "navigation_item" ("entity_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_navigation_item_deleted_at" ON "navigation_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "navigation_menu" ("id" text not null, "code" text not null, "name" text not null, "status" text check ("status" in ('draft', 'active', 'archived')) not null default 'draft', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "navigation_menu_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_navigation_menu_code_unique" ON "navigation_menu" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_navigation_menu_deleted_at" ON "navigation_menu" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "navigation_item" cascade;`);

    this.addSql(`drop table if exists "navigation_menu" cascade;`);
  }

}
