import { MedusaService } from "@medusajs/framework/utils"

import SepayPaymentAttempt from "./models/sepay-payment-attempt"

class SepayModuleService extends MedusaService({
  SepayPaymentAttempt,
}) {}

export default SepayModuleService