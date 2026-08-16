import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260817121000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "payos_payment_attempt" add column if not exists "raw_amount" jsonb null;`
    )
    this.addSql(
      `update "payos_payment_attempt" set "raw_amount" = jsonb_build_object('value', "amount"::text, 'precision', 20) where "raw_amount" is null;`
    )
    this.addSql(
      `alter table if exists "payos_payment_attempt" alter column "raw_amount" set not null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "payos_payment_attempt" drop column if exists "raw_amount";`
    )
  }
}
