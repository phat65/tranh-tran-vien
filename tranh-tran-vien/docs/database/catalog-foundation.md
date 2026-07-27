# Catalog Database Foundation

## Decision

Use Medusa core tables for commerce-owned entities:

- product
- product_variant
- product_category
- price
- cart
- customer
- order
- promotion

Use project-owned custom tables for data that Tranh Tran Vien needs to control independently:

- `brand`
- `taxonomy`
- `taxonomy_term`
- `navigation_menu`
- `navigation_item`
- `site_setting`
- `product_brand`
- `product_taxonomy_term`

## Product Relationships

Product-to-brand and product-to-taxonomy assignments are explicit custom tables, not bare Medusa module links.

Reason:

- Brand assignment needs `is_primary`.
- Merchandising may need `sort_order`.
- Admin workflows may need relationship metadata later.
- Storefront filtering should query stable relationship tables.

## Tables

### product_brand

Stores brand assignments for Medusa products.

- `product_id` points to Medusa core product ID.
- `brand_id` points to the custom `brand` table.
- `is_primary` marks the main brand for display.
- One active row per product/brand is allowed.
- One active primary brand per product is allowed.

There is no database foreign key to Medusa product because product is owned by a separate Medusa core module. Application services must validate product existence before writing assignments.

### product_taxonomy_term

Stores taxonomy term assignments for Medusa products.

- `product_id` points to Medusa core product ID.
- `term_id` points to the custom `taxonomy_term` table.
- One active row per product/term is allowed.

Application services must validate product existence before writing assignments.

## Migration Rule

All schema changes must be represented as code and migration files under `apps/backend/src/modules/**/migrations`.

Do not apply manual SQL as the normal development workflow.
