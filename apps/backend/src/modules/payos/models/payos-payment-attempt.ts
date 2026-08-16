import { model } from "@medusajs/framework/utils"

const PayosPaymentAttempt = model.define("payos_payment_attempt", {
  id: model.id({ prefix: "payosattempt" }).primaryKey(),
  payment_session_id: model.text().index(),
  order_code: model.text().unique(),
  payment_link_id: model.text().index().nullable(),
  amount: model.bigNumber(),
  currency_code: model.text().default("vnd"),
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
  qr_code: model.text().nullable(),
  reference: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default PayosPaymentAttempt
