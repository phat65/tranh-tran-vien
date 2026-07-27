import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260726195454 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_taxonomy_term" ("id" text not null, "product_id" text not null, "term_id" text not null, "sort_order" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_taxonomy_term_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_taxonomy_term_product_id" ON "product_taxonomy_term" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_taxonomy_term_term_id" ON "product_taxonomy_term" ("term_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_taxonomy_term_deleted_at" ON "product_taxonomy_term" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_taxonomy_term_product_term_unique" ON "product_taxonomy_term" ("product_id", "term_id") WHERE deleted_at IS NULL;`);
    this.addSql(`alter table if exists "product_taxonomy_term" add constraint "product_taxonomy_term_term_id_foreign" foreign key ("term_id") references "taxonomy_term" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_taxonomy_term" cascade;`);
  }

}
