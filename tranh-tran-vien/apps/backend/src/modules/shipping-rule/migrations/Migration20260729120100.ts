import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260729120100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "shipping_rule" add column if not exists "collection_id" text null;`);
    this.addSql(`alter table if exists "shipping_rule" drop constraint if exists "shipping_rule_scope_type_check";`);
    this.addSql(`alter table if exists "shipping_rule" add constraint "shipping_rule_scope_type_check" check ("scope_type" in ('all', 'product', 'category', 'collection', 'brand', 'taxonomy'));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_rule_collection_id" ON "shipping_rule" ("collection_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_shipping_rule_collection_id";`);
    this.addSql(`alter table if exists "shipping_rule" drop constraint if exists "shipping_rule_scope_type_check";`);
    this.addSql(`alter table if exists "shipping_rule" add constraint "shipping_rule_scope_type_check" check ("scope_type" in ('all', 'product', 'category', 'brand', 'taxonomy'));`);
    this.addSql(`alter table if exists "shipping_rule" drop column if exists "collection_id";`);
  }
}
