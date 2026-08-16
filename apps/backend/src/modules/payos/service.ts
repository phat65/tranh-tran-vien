import { MedusaService } from "@medusajs/framework/utils"

import PayosPaymentAttempt from "./models/payos-payment-attempt"

class PayosModuleService extends MedusaService({
  PayosPaymentAttempt,
}) {}

export default PayosModuleService
