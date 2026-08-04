import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728183400 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "post" drop constraint if exists "post_slug_unique";`);
    this.addSql(`alter table if exists "page" drop constraint if exists "page_slug_unique";`);

    this.addSql(`create table if not exists "post" ("id" text not null, "title" text not null, "slug" text not null, "excerpt" text null, "content_json" jsonb null, "cover_image_url" text null, "author_id" text null, "category_id" text null, "status" text check ("status" in ('draft', 'published', 'archived')) not null default 'draft', "published_at" timestamptz null, "seo_title" text null, "seo_description" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "post_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_post_slug_unique" ON "post" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_post_author_id" ON "post" ("author_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_post_category_id" ON "post" ("category_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_post_published_at" ON "post" ("published_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_post_deleted_at" ON "post" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "page" ("id" text not null, "title" text not null, "slug" text not null, "content_json" jsonb null, "page_type" text not null default 'static', "status" text check ("status" in ('draft', 'published', 'archived')) not null default 'draft', "published_at" timestamptz null, "seo_title" text null, "seo_description" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "page_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_page_slug_unique" ON "page" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_page_page_type" ON "page" ("page_type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_page_published_at" ON "page" ("published_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_page_deleted_at" ON "page" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "post" cascade;`);
    this.addSql(`drop table if exists "page" cascade;`);
  }
}
