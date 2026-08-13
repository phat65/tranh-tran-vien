# IMPLEMENTATION PLAN

## Phase 0 — Project Foundation

- Initialize repository.
- Configure TypeScript strict.
- Configure lint/format.
- Setup environment validation.
- Setup storefront/backend.
- Setup PostgreSQL.
- Setup storage.
- Add CI.

Exit criteria:
- apps boot,
- DB works,
- build pass,
- CI pass.

## Phase 1 — Design Foundation

- Tokens.
- Typography.
- Layout/container.
- Button.
- Modal/drawer.
- Header.
- Footer.

Exit:
- responsive shell complete.

## Phase 2 — Commerce Catalog

- Product model mapping.
- Collection mapping.
- ProductCard.
- ProductGrid.
- Collection page.
- Product detail base.
- Search.

Exit:
- browse catalog end-to-end.

## Phase 3 — Cart & Checkout

- Cart state.
- Add/update/remove.
- Cart drawer.
- Cart page.
- Promotion display.
- Checkout handoff.

Exit:
- standard product purchase path works.

## Phase 4 — Admin Core

- Admin auth.
- roles/permissions.
- product management.
- collection management.
- order list/detail.
- customers.

Exit:
- staff vận hành order thường được.

## Phase 5 — Custom Artwork

- private upload.
- upload validation.
- artwork entity.
- preview/configuration.
- cart linkage.
- order item linkage.
- admin artwork detail.

Exit:
- custom order được tạo và xem trong admin.

## Phase 6 — Production Workflow

- production entity.
- status transitions.
- assignment.
- internal notes.
- due date.
- order detail integration.
- audit log.

Exit:
- theo dõi custom order từ file đến ready-to-ship.

## Phase 7 — Approval

- preview versions.
- customer approval.
- revision request.
- approval history.
- approval notification hook.

Exit:
- khách duyệt thiết kế trước production.

## Phase 8 — Inventory & Fulfillment

- stock.
- low-stock alert.
- shipping.
- tracking.
- fulfillment statuses.

## Phase 9 — Content & Marketing

- homepage config.
- banners.
- featured collections.
- promotions.
- SEO controls.

## Phase 10 — Reports & Operations

- dashboard.
- reports.
- production overdue.
- CSV export optional.

## Phase 11 — Quality

- performance.
- accessibility.
- SEO.
- security review.
- E2E regression.
- backup verification.

## Ticket Rule

Mỗi ticket phải có:
- goal,
- scope,
- acceptance criteria,
- files/modules affected,
- tests required.

Không code phase sau chỉ vì phase trước “gần xong”.
