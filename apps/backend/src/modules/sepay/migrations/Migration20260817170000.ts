import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260817170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "sepay_payment_attempt" ("id" text not null, "payment_session_id" text not null, "invoice_number" text not null, "sepay_order_id" text null, "transaction_id" text null, "amount" numeric not null, "raw_amount" jsonb not null, "currency_code" text not null default 'vnd', "payment_method" text check ("payment_method" in ('BANK_TRANSFER', 'NAPAS_BANK_TRANSFER')) not null default 'BANK_TRANSFER', "status" text check ("status" in ('creating', 'pending', 'processing', 'paid', 'cancelled', 'failed')) not null default 'creating', "checkout_url" text null, "checkout_fields" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "sepay_payment_attempt_pkey" primary key ("id"), constraint "sepay_payment_attempt_invoice_number_unique" unique ("invoice_number"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_sepay_payment_attempt_payment_session_id" ON "sepay_payment_attempt" ("payment_session_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_sepay_payment_attempt_sepay_order_id" ON "sepay_payment_attempt" ("sepay_order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_sepay_payment_attempt_transaction_id" ON "sepay_payment_attempt" ("transaction_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_sepay_payment_attempt_deleted_at" ON "sepay_payment_attempt" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "sepay_payment_attempt" cascade;`)
  }
}
