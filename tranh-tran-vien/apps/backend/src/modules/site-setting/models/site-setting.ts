import { model } from "@medusajs/framework/utils"

const SiteSetting = model.define("site_setting", {
  id: model.id({ prefix: "setting" }).primaryKey(),
  key: model.text().unique(),
  value_json: model.json(),
  is_public: model.boolean().default(false),
  group: model.text().index().nullable(),
  description: model.text().nullable(),
})

export default SiteSetting
