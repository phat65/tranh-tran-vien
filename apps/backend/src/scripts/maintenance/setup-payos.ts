import type { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

import { parseBackendEnv } from "../../lib/env"
import { PayOSClient } from "../../modules/payos-payment/client"

const PAYOS_PROVIDER_ID = "pp_payos_payos"

type RegionRecord = {
  id: string
  name: string
  currency_code: string
  payment_providers?: { id: string }[]
}

export default async function setupPayOS({
  container,
}: {
  container: MedusaContainer
}) {
  const env = parseBackendEnv(process.env)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  if (
    !env.PAYOS_CLIENT_ID ||
    !env.PAYOS_API_KEY ||
    !env.PAYOS_CHECKSUM_KEY ||
    !env.PAYOS_RETURN_URL ||
    !env.PAYOS_CANCEL_URL
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Configure PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY, PAYOS_RETURN_URL and PAYOS_CANCEL_URL first"
    )
  }

  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "payment_providers.id"],
    filters: { currency_code: "vnd" },
  })
  const region = (data as RegionRecord[]).find((item) =>
    item.payment_providers?.some((provider) => provider.id === PAYOS_PROVIDER_ID)
  ) ?? (data as RegionRecord[])[0]

  if (!region) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No VND region found. Run the initial backend seed first."
    )
  }

  const paymentProviders = Array.from(
    new Set([
      ...(region.payment_providers?.map((provider) => provider.id) ?? []),
      PAYOS_PROVIDER_ID,
    ])
  )

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: region.id },
      update: { payment_providers: paymentProviders },
    },
  })

  logger.info(`Enabled ${PAYOS_PROVIDER_ID} for region ${region.name}`)

  if (!env.PAYOS_WEBHOOK_URL) {
    logger.warn(
      "PAYOS_WEBHOOK_URL is empty. Configure a public HTTPS webhook URL and run this command again."
    )
    return
  }

  const client = new PayOSClient({
    clientId: env.PAYOS_CLIENT_ID,
    apiKey: env.PAYOS_API_KEY,
    checksumKey: env.PAYOS_CHECKSUM_KEY,
    apiUrl: env.PAYOS_API_URL,
    partnerCode: env.PAYOS_PARTNER_CODE,
  })

  await client.confirmWebhook(env.PAYOS_WEBHOOK_URL)
  logger.info(`Confirmed PayOS webhook: ${env.PAYOS_WEBHOOK_URL}`)
}
