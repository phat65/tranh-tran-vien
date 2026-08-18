import type { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

import { parseBackendEnv } from "../../lib/env"

const SEPAY_PROVIDER_ID = "pp_sepay_sepay"

type RegionRecord = {
  id: string
  name: string
  currency_code: string
  payment_providers?: { id: string }[]
}

export default async function setupSePay({
  container,
}: {
  container: MedusaContainer
}) {
  const env = parseBackendEnv(process.env)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  if (
    !env.SEPAY_ENVIRONMENT ||
    !env.SEPAY_MERCHANT_ID ||
    !env.SEPAY_SECRET_KEY ||
    !env.SEPAY_SUCCESS_URL ||
    !env.SEPAY_ERROR_URL ||
    !env.SEPAY_CANCEL_URL
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Configure SEPAY_ENVIRONMENT, SEPAY_MERCHANT_ID, SEPAY_SECRET_KEY, SEPAY_SUCCESS_URL, SEPAY_ERROR_URL and SEPAY_CANCEL_URL first"
    )
  }

  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "payment_providers.id"],
    filters: { currency_code: "vnd" },
  })
  const regions = data as RegionRecord[]
  const region =
    regions.find((item) =>
      item.payment_providers?.some(
        (provider) => provider.id === SEPAY_PROVIDER_ID
      )
    ) ?? regions[0]

  if (!region) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No VND region found. Run the initial backend seed first."
    )
  }

  const paymentProviders = Array.from(
    new Set([
      ...(region.payment_providers?.map((provider) => provider.id) ?? []),
      SEPAY_PROVIDER_ID,
    ])
  )

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: region.id },
      update: { payment_providers: paymentProviders },
    },
  })

  logger.info(`Enabled ${SEPAY_PROVIDER_ID} for region ${region.name}`)
}
