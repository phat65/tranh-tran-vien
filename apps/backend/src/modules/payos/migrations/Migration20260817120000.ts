import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260817120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "payos_payment_attempt" ("id" text not null, "payment_session_id" text not null, "order_code" text not null, "payment_link_id" text null, "amount" numeric not null, "raw_amount" jsonb not null, "currency_code" text not null default 'vnd', "status" text check ("status" in ('creating', 'pending', 'processing', 'paid', 'cancelled', 'failed')) not null default 'creating', "checkout_url" text null, "qr_code" text null, "reference" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payos_payment_attempt_pkey" primary key ("id"), constraint "payos_payment_attempt_order_code_unique" unique ("order_code"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payos_payment_attempt_payment_session_id" ON "payos_payment_attempt" ("payment_session_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payos_payment_attempt_payment_link_id" ON "payos_payment_attempt" ("payment_link_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payos_payment_attempt_deleted_at" ON "payos_payment_attempt" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payos_payment_attempt" cascade;`)
  }
}
