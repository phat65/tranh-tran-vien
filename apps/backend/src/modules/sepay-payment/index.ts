import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import SePayPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [SePayPaymentProviderService],
})
