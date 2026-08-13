// Migration tạo hoặc cập nhật schema dữ liệu cho module feedback.

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728183300 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "feedback" ("id" text not null, "customer_id" text null, "customer_name" text not null, "order_id" text null, "product_id" text null, "rating" integer not null default 5, "content" text null, "status" text check ("status" in ('draft', 'pending_review', 'approved', 'rejected', 'archived')) not null default 'pending_review', "published_at" timestamptz null, "sort_order" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "feedback_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feedback_customer_id" ON "feedback" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feedback_order_id" ON "feedback" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feedback_product_id" ON "feedback" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feedback_published_at" ON "feedback" ("published_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feedback_deleted_at" ON "feedback" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "feedback_media" ("id" text not null, "feedback_id" text not null, "type" text check ("type" in ('image', 'video')) not null default 'image', "object_key" text not null, "url" text null, "sort_order" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "feedback_media_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feedback_media_feedback_id" ON "feedback_media" ("feedback_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feedback_media_deleted_at" ON "feedback_media" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "feedback_media" cascade;`);
    this.addSql(`drop table if exists "feedback" cascade;`);
  }
}
