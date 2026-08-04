import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728183000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "design_request" ("id" text not null, "customer_id" text null, "guest_token" text null, "product_id" text not null, "variant_id" text null, "piece_count" integer not null default 1, "layout_template_id" text null, "status" text check ("status" in ('draft', 'uploading', 'submitted', 'attached_to_cart', 'ordered', 'designing', 'awaiting_customer_approval', 'revision_requested', 'approved', 'in_production', 'completed', 'cancelled')) not null default 'draft', "customer_note" text null, "internal_note" text null, "preview_url" text null, "snapshot_json" jsonb null, "cart_id" text null, "order_id" text null, "order_line_item_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "design_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_request_customer_id" ON "design_request" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_request_guest_token" ON "design_request" ("guest_token") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_request_product_id" ON "design_request" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_request_variant_id" ON "design_request" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_request_layout_template_id" ON "design_request" ("layout_template_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_request_cart_id" ON "design_request" ("cart_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_request_order_id" ON "design_request" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_request_order_line_item_id" ON "design_request" ("order_line_item_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_request_deleted_at" ON "design_request" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "design_asset" ("id" text not null, "design_request_id" text not null, "object_key" text not null, "original_filename" text not null, "mime_type" text not null, "size_bytes" integer not null default 0, "width" integer null, "height" integer null, "checksum" text null, "upload_status" text check ("upload_status" in ('pending', 'uploaded', 'verified', 'rejected', 'expired')) not null default 'pending', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "design_asset_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_asset_design_request_id" ON "design_asset" ("design_request_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_design_asset_object_key_unique" ON "design_asset" ("object_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_asset_mime_type" ON "design_asset" ("mime_type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_asset_checksum" ON "design_asset" ("checksum") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_asset_deleted_at" ON "design_asset" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "design_canvas_item" ("id" text not null, "design_request_id" text not null, "design_asset_id" text null, "slot_index" integer not null default 0, "crop_data_json" jsonb null, "transform_data_json" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "design_canvas_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_canvas_item_design_request_id" ON "design_canvas_item" ("design_request_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_canvas_item_design_asset_id" ON "design_canvas_item" ("design_asset_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_canvas_item_deleted_at" ON "design_canvas_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "design_revision" ("id" text not null, "design_request_id" text not null, "version" integer not null default 1, "preview_url" text null, "status" text check ("status" in ('draft', 'sent', 'approved', 'revision_requested', 'rejected')) not null default 'draft', "note" text null, "created_by" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "design_revision_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_revision_design_request_id" ON "design_revision" ("design_request_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_revision_created_by" ON "design_revision" ("created_by") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_design_revision_request_version_unique" ON "design_revision" ("design_request_id", "version") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_revision_deleted_at" ON "design_revision" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "layout_template" ("id" text not null, "name" text not null, "piece_count" integer not null default 1, "thumbnail_url" text null, "canvas_width" integer not null default 0, "canvas_height" integer not null default 0, "layout_json" jsonb not null, "status" text check ("status" in ('draft', 'active', 'archived')) not null default 'draft', "sort_order" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "layout_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_layout_template_deleted_at" ON "layout_template" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "design_asset" cascade;`);
    this.addSql(`drop table if exists "design_canvas_item" cascade;`);
    this.addSql(`drop table if exists "design_revision" cascade;`);
    this.addSql(`drop table if exists "design_request" cascade;`);
    this.addSql(`drop table if exists "layout_template" cascade;`);
  }
}
