// API admin cho Explore: 5 group cố định, item con là taxonomy term, product được gán trực tiếp vào term.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { randomUUID } from "crypto"

import {
  EXPLORE_GROUP_DEFINITIONS,
  expandExploreTermIdsWithAutoAssignments,
  resolveExploreNavigations,
} from "../../../../../lib/explore-navigation"
import {
  assertProductExists,
  getTaxonomyService,
  unique,
} from "../utils"
import {
  planBulkExploreAssignment,
} from "./bulk-assignment"
import {
  BULK_EXPLORE_ACTIONS,
  MAX_BULK_EXPLORE_PRODUCTS,
} from "../../../../../lib/explore-bulk-assignment"

const exploreGroups = EXPLORE_GROUP_DEFINITIONS

const assignmentBodySchema = z
  .object({
    product_id: z.string().trim().min(1),
    term_id: z.string().trim().min(1).nullable().optional(),
    term_ids: z.array(z.string().trim().min(1)).optional(),
  })
  .strict()

const bulkAssignmentBodySchema = z
  .object({
    product_ids: z
      .array(z.string().trim().min(1))
      .min(1)
      .max(MAX_BULK_EXPLORE_PRODUCTS),
    action: z.enum(BULK_EXPLORE_ACTIONS),
    term_id: z.string().trim().min(1),
    source_term_id: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.action === "move" && !input.source_term_id) {
      context.addIssue({
        code: "custom",
        path: ["source_term_id"],
        message: "Move requires a source Explore item.",
      })
    }

    if (
      input.action === "move" &&
      input.source_term_id === input.term_id
    ) {
      context.addIssue({
        code: "custom",
        path: ["term_id"],
        message: "Source and destination Explore items must be different.",
      })
    }
  })

const galleryImageInputSchema = z
  .object({
    image_id: z.string().trim().min(1).optional(),
    url: z.string().trim().min(1),
    original_filename: z.string().trim().optional().default(""),
    alt: z.string().trim().optional().default(""),
  })
  .strict()

const galleryPatchSchema = z
  .object({
    code: z.string().trim().min(1).optional(),
    original_filename: z.string().trim().optional(),
    alt: z.string().trim().optional(),
    sort_order: z.coerce.number().int().min(0).optional(),
    visibility: z.enum(["visible", "hidden"]).optional(),
  })
  .strict()

const galleryBodySchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("add_images"),
      term_id: z.string().trim().min(1),
      images: z.array(galleryImageInputSchema).min(1),
    })
    .strict(),
  z
    .object({
      action: z.literal("update_image"),
      term_id: z.string().trim().min(1),
      image_id: z.string().trim().min(1),
      patch: galleryPatchSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("delete_image"),
      term_id: z.string().trim().min(1),
      image_id: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      action: z.literal("reorder_images"),
      term_id: z.string().trim().min(1),
      image_ids: z.array(z.string().trim().min(1)).min(1),
    })
    .strict(),
])

type TaxonomyRecord = {
  id: string
  code: string
  name: string
  description?: string | null
  status: "draft" | "active" | "archived"
  sort_order: number
  metadata?: Record<string, unknown> | null
}

type TaxonomyTermRecord = {
  id: string
  taxonomy_id: string
  name: string
  slug: string
  image_url?: string | null
  description?: string | null
  status: "draft" | "active" | "archived"
  sort_order: number
  metadata?: Record<string, unknown> | null
}

type ProductTaxonomyTermRecord = {
  id: string
  product_id: string
  term_id: string
}

type GalleryImageRecord = {
  image_id: string
  code: string
  url: string
  original_filename: string
  alt: string
  sort_order: number
  visibility: "visible" | "hidden"
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId =
    typeof req.query.product_id === "string" ? req.query.product_id : undefined
  const productIds = parseProductIds(req.query.product_ids)
  const termIds = parseProductIds(req.query.term_ids)

  if (productId) {
    await assertProductExists(req.scope, productId)
  }

  const taxonomyService = getTaxonomyService(req.scope)
  const groups = await getExploreGroups(taxonomyService)
  const selected_term_ids = productId
    ? await getSelectedExploreTermIds(taxonomyService, productId, groups)
    : []
  const selected_term_ids_by_product_id = productIds.length
    ? await getSelectedExploreTermIdsByProductId(
        taxonomyService,
        productIds,
        groups
      )
    : {}
  const filtered_product_ids = termIds.length
    ? await getProductIdsForExploreTermIds(taxonomyService, termIds, groups)
    : []

  res.status(200).json({
    groups,
    selected_term_id: selected_term_ids[0] ?? null,
    selected_term_ids,
    selected_term_ids_by_product_id,
    filtered_product_ids,
  })
}

export async function PATCH(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const input = galleryBodySchema.parse(req.body)
  const taxonomyService = getTaxonomyService(req.scope)
  const groups = await getExploreGroups(taxonomyService)
  const exploreTerms = groups.flatMap((group) => group.terms)
  const term = exploreTerms.find((candidate) => candidate.id === input.term_id)

  if (!term) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Explore item not found: ${input.term_id}`
    )
  }

  const currentImages = getGalleryImages(term)
  let nextImages: GalleryImageRecord[]

  if (input.action === "add_images") {
    const nextCodeNumber = getNextImageCodeNumber(currentImages)

    nextImages = [
      ...currentImages,
      ...input.images.map((image, index) => ({
        image_id: image.image_id || randomUUID(),
        code: `${getImageCodePrefix(term)}-${String(
          nextCodeNumber + index
        ).padStart(3, "0")}`,
        url: image.url,
        original_filename: image.original_filename ?? "",
        alt: image.alt ?? "",
        sort_order: currentImages.length + index,
        visibility: "visible" as const,
      })),
    ]
  } else if (input.action === "update_image") {
    nextImages = currentImages.map((image) =>
      image.image_id === input.image_id
        ? {
            ...image,
            ...input.patch,
          }
        : image
    )
  } else if (input.action === "delete_image") {
    nextImages = currentImages.filter((image) => image.image_id !== input.image_id)
  } else {
    const orderMap = new Map(
      input.image_ids.map((imageId, index) => [imageId, index])
    )
    nextImages = [...currentImages].sort(
      (first, second) =>
        (orderMap.get(first.image_id) ?? currentImages.length) -
        (orderMap.get(second.image_id) ?? currentImages.length)
    )
  }

  nextImages = normalizeGalleryImages(nextImages)

  const [taxonomy_term] = (await taxonomyService.updateTaxonomyTerms({
    selector: { id: term.id },
    data: {
      metadata: {
        ...(term.metadata ?? {}),
        gallery_images: nextImages,
      },
    },
  })) as TaxonomyTermRecord[]

  res.status(200).json({
    taxonomy_term: taxonomy_term ?? {
      ...term,
      metadata: {
        ...(term.metadata ?? {}),
        gallery_images: nextImages,
      },
    },
    gallery_images: nextImages,
  })
}

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const input = bulkAssignmentBodySchema.parse(req.body)
  const productIds = unique(input.product_ids)
  const taxonomyService = getTaxonomyService(req.scope)
  const groups = await getExploreGroups(taxonomyService)
  const target = findExploreTerm(groups, input.term_id)

  if (!target) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Explore item not found: ${input.term_id}`
    )
  }

  const source = input.source_term_id
    ? findExploreTerm(groups, input.source_term_id)
    : null

  if (input.action === "move" && !source) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Source Explore item not found: ${input.source_term_id}`
    )
  }

  await assertProductsExist(req, productIds)

  const automaticallyAssignedTermIds =
    input.action === "remove"
      ? []
      : expandExploreTermIdsWithAutoAssignments(
          [input.term_id],
          groups
        ).filter((termId) => termId !== input.term_id)
  const relevantTermIds = unique([
    input.term_id,
    ...(input.source_term_id ? [input.source_term_id] : []),
    ...automaticallyAssignedTermIds,
  ])
  const existingLinks = await listAllProductTaxonomyTerms(taxonomyService, {
    product_id: productIds,
    term_id: relevantTermIds,
  })
  const plan = planBulkExploreAssignment({
    action: input.action,
    productIds,
    termId: input.term_id,
    sourceTermId: input.source_term_id,
    additionalTermIdsToAdd: automaticallyAssignedTermIds,
    existingLinks,
  })

  if (plan.linksToCreate.length) {
    await taxonomyService.createProductTaxonomyTerms(
      plan.linksToCreate.map((link) => ({
        ...link,
        sort_order: 0,
        metadata: {
          source: "explore-bulk",
          action: input.action,
        },
      }))
    )
  }

  if (plan.linkIdsToDelete.length) {
    await taxonomyService.deleteProductTaxonomyTerms(plan.linkIdsToDelete)
  }

  res.status(200).json({
    action: input.action,
    requested_count: productIds.length,
    updated_count: plan.updatedProductIds.length,
    unchanged_count: plan.unchangedProductIds.length,
    updated_product_ids: plan.updatedProductIds,
    automatically_assigned_term_ids: automaticallyAssignedTermIds,
    target: {
      heading_code: target.group.code,
      heading_label: target.group.label,
      term_id: target.term.id,
      term_name: target.term.name,
    },
    source: source
      ? {
          heading_code: source.group.code,
          heading_label: source.group.label,
          term_id: source.term.id,
          term_name: source.term.name,
        }
      : null,
  })
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const input = assignmentBodySchema.parse(req.body)

  await assertProductExists(req.scope, input.product_id)

  const taxonomyService = getTaxonomyService(req.scope)
  const groups = await getExploreGroups(taxonomyService)
  const exploreTermIds = new Set(
    groups.flatMap((group) => group.terms.map((term) => term.id))
  )
  const requestedTermIds = unique([
    ...(input.term_ids ?? []),
    ...(input.term_id ? [input.term_id] : []),
  ])

  const invalidTermIds = requestedTermIds.filter(
    (termId) => !exploreTermIds.has(termId)
  )

  if (invalidTermIds.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Explore item not found: ${invalidTermIds.join(", ")}`
    )
  }

  const termIds = expandExploreTermIdsWithAutoAssignments(
    requestedTermIds,
    groups
  )

  const existingLinks = (await taxonomyService.listProductTaxonomyTerms({
    product_id: input.product_id,
  })) as ProductTaxonomyTermRecord[]
  const exploreLinks = existingLinks.filter((link) =>
    exploreTermIds.has(link.term_id)
  )

  if (exploreLinks.length) {
    await taxonomyService.deleteProductTaxonomyTerms(
      exploreLinks.map((link) => link.id)
    )
  }

  if (termIds.length) {
    await taxonomyService.createProductTaxonomyTerms([
      ...termIds.map((termId, index) => ({
        product_id: input.product_id,
        term_id: termId,
        sort_order: index,
        metadata: { source: "explore" },
      })),
    ])
  }

  res.status(200).json({
    product_id: input.product_id,
    selected_term_id: termIds[0] ?? null,
    selected_term_ids: termIds,
  })
}

function findExploreTerm(
  groups: Awaited<ReturnType<typeof getExploreGroups>>,
  termId: string
) {
  for (const group of groups) {
    const term = group.terms.find((candidate) => candidate.id === termId)

    if (term) {
      return { group, term }
    }
  }

  return null
}

async function assertProductsExist(
  req: MedusaRequest,
  productIds: string[]
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productIds,
    },
    pagination: {
      take: productIds.length,
    },
  })
  const foundProductIds = new Set(
    (data as { id: string }[]).map((product) => product.id)
  )
  const missingProductIds = productIds.filter(
    (productId) => !foundProductIds.has(productId)
  )

  if (missingProductIds.length) {
    const preview = missingProductIds.slice(0, 10).join(", ")
    const remainder = missingProductIds.length > 10 ? ", ..." : ""

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Products not found (${missingProductIds.length}): ${preview}${remainder}`
    )
  }
}

async function listAllProductTaxonomyTerms(
  taxonomyService: ReturnType<typeof getTaxonomyService>,
  filters: {
    product_id: string[]
    term_id: string[]
  }
) {
  const links: ProductTaxonomyTermRecord[] = []
  const take = 500
  let skip = 0

  while (true) {
    const page = (await taxonomyService.listProductTaxonomyTerms(filters, {
      skip,
      take,
    })) as ProductTaxonomyTermRecord[]

    links.push(...page)

    if (page.length < take) {
      break
    }

    skip += take
  }

  return links
}

async function getExploreGroups(taxonomyService: any) {
  const taxonomies = (await taxonomyService.listTaxonomies(
    {},
    { take: 500, order: { sort_order: "ASC", created_at: "DESC" } }
  )) as TaxonomyRecord[]
  const byCode = new Map(taxonomies.map((taxonomy) => [taxonomy.code, taxonomy]))

  for (const group of exploreGroups) {
    const existing = byCode.get(group.code)

    if (!existing) {
      const taxonomy = (await taxonomyService.createTaxonomies({
        code: group.code,
        name: group.label,
        description: null,
        status: "active",
        sort_order: group.sort_order,
        metadata: {
          explore: true,
          locked: true,
          slug: group.slug,
        },
      })) as TaxonomyRecord

      byCode.set(group.code, taxonomy)
      continue
    }

    if (
      existing.name !== group.label ||
      existing.status !== "active" ||
      existing.sort_order !== group.sort_order
    ) {
      const [updated] = (await taxonomyService.updateTaxonomies({
        selector: { id: existing.id },
        data: {
          name: group.label,
          status: "active",
          sort_order: group.sort_order,
          metadata: {
            ...(existing.metadata ?? {}),
            explore: true,
            locked: true,
            slug: group.slug,
          },
        },
      })) as TaxonomyRecord[]

      byCode.set(group.code, updated ?? existing)
    }
  }

  const termsByTaxonomyId = new Map<string, TaxonomyTermRecord[]>()

  for (const taxonomy of byCode.values()) {
    if (!exploreGroups.some((group) => group.code === taxonomy.code)) {
      continue
    }

    const terms = (await taxonomyService.listTaxonomyTerms(
      { taxonomy_id: taxonomy.id },
      { take: 200, order: { sort_order: "ASC", created_at: "DESC" } }
    )) as TaxonomyTermRecord[]

    termsByTaxonomyId.set(taxonomy.id, terms)
  }

  const groups = exploreGroups.map((group) => {
    const taxonomy = byCode.get(group.code)

    return {
      code: group.code,
      label: group.label,
      slug: group.slug,
      sort_order: group.sort_order,
      taxonomy_id: taxonomy?.id ?? null,
      metadata: taxonomy?.metadata ?? null,
      terms: taxonomy ? termsByTaxonomyId.get(taxonomy.id) ?? [] : [],
    }
  })

  return resolveExploreNavigations(groups)
}

async function getSelectedExploreTermIds(
  taxonomyService: any,
  productId: string,
  groups: Awaited<ReturnType<typeof getExploreGroups>>
) {
  const exploreTermIds = new Set(
    groups.flatMap((group) => group.terms.map((term) => term.id))
  )
  const productLinks = (await taxonomyService.listProductTaxonomyTerms({
    product_id: productId,
  })) as ProductTaxonomyTermRecord[]

  return productLinks
    .filter((link) => exploreTermIds.has(link.term_id))
    .sort((first, second) => {
      const firstIndex = groups.findIndex((group) =>
        group.terms.some((term) => term.id === first.term_id)
      )
      const secondIndex = groups.findIndex((group) =>
        group.terms.some((term) => term.id === second.term_id)
      )

      return firstIndex - secondIndex
    })
    .map((link) => link.term_id)
}

async function getSelectedExploreTermIdsByProductId(
  taxonomyService: any,
  productIds: string[],
  groups: Awaited<ReturnType<typeof getExploreGroups>>
) {
  const selectedTermIdsByProductId: Record<string, string[]> = {}

  for (const productId of unique(productIds)) {
    selectedTermIdsByProductId[productId] = await getSelectedExploreTermIds(
      taxonomyService,
      productId,
      groups
    )
  }

  return selectedTermIdsByProductId
}

async function getProductIdsForExploreTermIds(
  taxonomyService: any,
  termIds: string[],
  groups: Awaited<ReturnType<typeof getExploreGroups>>
) {
  const exploreTermIds = new Set(
    groups.flatMap((group) => group.terms.map((term) => term.id))
  )
  const validTermIds = unique(termIds).filter((termId) =>
    exploreTermIds.has(termId)
  )
  const productIds: string[] = []

  for (const termId of validTermIds) {
    const links = (await taxonomyService.listProductTaxonomyTerms({
      term_id: termId,
    })) as ProductTaxonomyTermRecord[]

    productIds.push(...links.map((link) => link.product_id))
  }

  return unique(productIds)
}

function getGalleryImages(term: TaxonomyTermRecord): GalleryImageRecord[] {
  const galleryImages = term.metadata?.gallery_images

  if (!Array.isArray(galleryImages)) {
    return []
  }

  return normalizeGalleryImages(
    galleryImages
      .map((entry): GalleryImageRecord | null => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return null
        }

        const image = entry as Record<string, unknown>
        const url = typeof image.url === "string" ? image.url.trim() : ""
        const imageId =
          typeof image.image_id === "string" ? image.image_id.trim() : ""
        const code = typeof image.code === "string" ? image.code.trim() : ""

        if (!url || !imageId || !code) {
          return null
        }

        return {
          image_id: imageId,
          code,
          url,
          original_filename:
            typeof image.original_filename === "string"
              ? image.original_filename
              : "",
          alt: typeof image.alt === "string" ? image.alt : "",
          sort_order:
            typeof image.sort_order === "number"
              ? image.sort_order
              : Number(image.sort_order ?? 0),
          visibility: image.visibility === "hidden" ? "hidden" : "visible",
        }
      })
      .filter((image): image is GalleryImageRecord => Boolean(image))
  )
}

function normalizeGalleryImages(images: GalleryImageRecord[]) {
  return [...images]
    .sort((first, second) => first.sort_order - second.sort_order)
    .map((image, index) => ({
      ...image,
      sort_order: index,
      original_filename: image.original_filename ?? "",
      alt: image.alt ?? "",
      visibility:
        image.visibility === "hidden"
          ? ("hidden" as const)
          : ("visible" as const),
    }))
}

function getNextImageCodeNumber(images: GalleryImageRecord[]) {
  const max = images.reduce((highest, image) => {
    const match = image.code.match(/-(\d+)$/)
    const number = match ? Number(match[1]) : 0

    return Number.isFinite(number) ? Math.max(highest, number) : highest
  }, 0)

  return max + 1
}

function getImageCodePrefix(term: TaxonomyTermRecord) {
  const base = (term.slug || term.name || "IMG")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 3)
    .toUpperCase()

  return base.padEnd(3, "X")
}

function parseProductIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return unique(
      value.flatMap((item) =>
        typeof item === "string" ? item.split(",") : []
      )
    )
  }

  if (typeof value !== "string") {
    return []
  }

  return unique(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  )
}
