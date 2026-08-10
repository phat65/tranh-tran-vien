// Service Medusa chứa nghiệp vụ và thao tác dữ liệu cho module navigation.

import { MedusaService } from "@medusajs/framework/utils"

import NavigationItem from "./models/navigation-item"
import NavigationMenu from "./models/navigation-menu"

class NavigationModuleService extends MedusaService({
  NavigationItem,
  NavigationMenu,
}) {}

export default NavigationModuleService
