import { Modules, ModuleProvider } from "@medusajs/framework/utils"

import PayOSPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [PayOSPaymentProviderService],
})
