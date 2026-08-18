import { model } from "@medusajs/framework/utils"

const SepayPaymentAttempt = model.define("sepay_payment_attempt", {
  id: model.id({ prefix: "sepayattempt" }).primaryKey(),
  payment_session_id: model.text().index(),
  invoice_number: model.text().unique(),
  sepay_order_id: model.text().index().nullable(),
  transaction_id: model.text().index().nullable(),
  amount: model.bigNumber(),
  currency_code: model.text().default("vnd"),
  payment_method: model
    .enum(["BANK_TRANSFER", "NAPAS_BANK_TRANSFER"])
    .default("BANK_TRANSFER"),
  status: model
    .enum([
      "creating",
      "pending",
      "processing",
      "paid",
      "cancelled",
      "failed",
    ])
    .default("creating"),
  checkout_url: model.text().nullable(),
  checkout_fields: model.json().nullable(),
  metadata: model.json().nullable(),
})

export default SepayPaymentAttempt
