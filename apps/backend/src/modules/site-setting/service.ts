// Service Medusa chứa nghiệp vụ và thao tác dữ liệu cho module site setting.

import { MedusaService } from "@medusajs/framework/utils"

import SiteSetting from "./models/site-setting"

class SiteSettingModuleService extends MedusaService({
  SiteSetting,
}) {}

export default SiteSettingModuleService
