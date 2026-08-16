// Helper dùng chung cho nhóm API admin / tranh tran vien / rules.

import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { COMBO_RULE_MODULE } from "../../../../modules/combo-rule"
import ComboRuleModuleService from "../../../../modules/combo-rule/service"
import { TAXONOMY_MODULE } from "../../../../modules/taxonomy"
import TaxonomyModuleService from "../../../../modules/taxonomy/service"
import { EXPLORE_GROUP_DEFINITIONS } from "../../../../lib/explore-navigation"
import { RulesListQuery, rulesListQuerySchema } from "./validators"

type QueryGraph = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    pagination?: {
      skip?: number
      take?: number
      order?: Record<string, "ASC" | "DESC">
    }
  }) => Promise<{ data: unknown[] }>
}

export function parseRulesListQuery(query: unknown): RulesListQuery {
  return rulesListQuerySchema.parse(query)
}

export function toRulesListConfig(query: RulesListQuery) {
  return {
    take: query.limit,
    skip: query.offset,
    order: { priority: "DESC" as const, created_at: "DESC" as const },
  }
}

export function addComboRuleFilters(
  filters: Record<string, unknown>,
  query: RulesListQuery
) {
  const filterKeys = [
    "status",
    "scope_type",
    "product_id",
    "category_id",
    "collection_id",
    "option_value_id",
    "taxonomy_term_id",
    "sales_channel_id",
    "region_id",
  ] as const

  filterKeys.forEach((key) => {
    if (query[key]) {
      filters[key] = query[key]
    }
  })
}

export function getComboRuleService(scope: MedusaContainer) {
  return scope.resolve<ComboRuleModuleService>(COMBO_RULE_MODULE)
}

export async function assertActiveExploreTerm(
  scope: MedusaContainer,
  termId: string
) {
  const service = scope.resolve<TaxonomyModuleService>(TAXONOMY_MODULE)
  const term = await service.retrieveTaxonomyTerm(termId)
  const taxonomy = await service.retrieveTaxonomy(term.taxonomy_id)
  const exploreCodes = new Set<string>(
    EXPLORE_GROUP_DEFINITIONS.map((group) => group.code)
  )

  if (
    term.status !== "active" ||
    taxonomy.status !== "active" ||
    !exploreCodes.has(taxonomy.code)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Combo rules can only use a visible Explore Item."
    )
  }

  return { taxonomy, term }
}

export function assertFound<T>(record: T | null | undefined, message: string): T {
  if (!record) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, message)
  }

  return record
}

export async function safeGraph<T>(
  scope: MedusaContainer,
  entity: string,
  fields: string[]
): Promise<T[]> {
  try {
    const query = scope.resolve<QueryGraph>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity,
      fields,
      pagination: {
        take: 200,
        order: { created_at: "DESC" },
      },
    })

    return data.filter(hasId) as T[]
  } catch {
    return []
  }
}

function hasId(record: unknown): boolean {
  return Boolean(
    record &&
      typeof record === "object" &&
      "id" in record &&
      typeof record.id === "string" &&
      record.id
  )
}
