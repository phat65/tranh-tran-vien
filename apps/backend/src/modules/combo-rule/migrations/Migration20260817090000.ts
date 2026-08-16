import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260817090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "combo_rule" add column if not exists "taxonomy_term_id" text null;`
    )
    this.addSql(
      `alter table if exists "combo_rule" drop constraint if exists "combo_rule_scope_type_check";`
    )
    this.addSql(
      `alter table if exists "combo_rule" add constraint "combo_rule_scope_type_check" check ("scope_type" in ('all', 'product', 'category', 'collection', 'option', 'taxonomy'));`
    )
    this.addSql(
      `alter table if exists "combo_rule" alter column "scope_type" set default 'taxonomy';`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_combo_rule_taxonomy_term_id" ON "combo_rule" ("taxonomy_term_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_combo_rule_taxonomy_term_id";`)
    this.addSql(
      `alter table if exists "combo_rule" drop constraint if exists "combo_rule_scope_type_check";`
    )
    this.addSql(
      `update "combo_rule" set "scope_type" = 'collection', "collection_id" = null, "status" = 'draft' where "scope_type" = 'taxonomy';`
    )
    this.addSql(
      `alter table if exists "combo_rule" add constraint "combo_rule_scope_type_check" check ("scope_type" in ('all', 'product', 'category', 'collection', 'option'));`
    )
    this.addSql(
      `alter table if exists "combo_rule" alter column "scope_type" set default 'collection';`
    )
    this.addSql(
      `alter table if exists "combo_rule" drop column if exists "taxonomy_term_id";`
    )
  }
}
