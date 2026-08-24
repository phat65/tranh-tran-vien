# PROJECT STRUCTURE

## Monorepo đề xuất

```txt
/
├── apps/
│   ├── storefront/
│   └── backend/
│
├── packages/
│   ├── shared/
│   └── config/
│
├── docs/
├── AGENTS.md
└── README.md
```

Nếu project không dùng monorepo, không bắt buộc migrate.

## Storefront

```txt
apps/storefront/
├── app/
│   ├── page.tsx
│   ├── collections/[slug]/page.tsx
│   ├── products/[slug]/page.tsx
│   ├── custom/page.tsx
│   ├── search/page.tsx
│   ├── cart/page.tsx
│   ├── account/
│   ├── track-order/
│   ├── about/
│   ├── faq/
│   └── policies/
│
├── components/
│   ├── layout/
│   ├── ui/
│   ├── commerce/
│   ├── search/
│   └── custom-product/
│
├── lib/
│   ├── api/
│   ├── commerce/
│   ├── analytics/
│   ├── utils/
│   └── validation/
│
├── types/
└── public/
```

## Backend

```txt
apps/backend/
├── src/
│   ├── api/
│   ├── modules/
│   │   ├── artwork/
│   │   └── production/
│   ├── workflows/
│   ├── subscribers/
│   ├── admin/
│   └── links/
└── medusa-config.ts
```

## Shared Package

```txt
packages/shared/
├── src/
│   ├── types/
│   ├── constants/
│   └── schemas/
```

Chỉ đưa vào shared nếu thực sự dùng từ nhiều app.

## Naming

Components:
`PascalCase.tsx`

Hooks:
`useSomething.ts`

Utilities:
`camelCase.ts`

Routes/folders:
`kebab-case`

Domain types:
`Product`, `Order`, `Artwork`, `ProductionJob`.

Không tạo tên kiểu:
- utils2,
- helpers-new,
- temp,
- final-final,
- service-v2.

## Component Rules

Không tách component nếu:
- chỉ dùng một lần,
- UI nhỏ,
- không có logic/tái sử dụng đáng kể.

Tách khi:
- component > ~200 dòng và có boundary rõ,
- có logic độc lập,
- có reuse,
- cần test riêng.

## Domain Boundaries

Storefront:
- rendering,
- interaction,
- API consumption.

Commerce:
- pricing,
- cart,
- orders,
- promotions,
- inventory.

Artwork:
- customer source,
- preview,
- approval,
- production assets.

Production:
- workflow,
- assignment,
- SLA,
- status transitions.

Không trộn các domain trên.

## Current Structure Notes

Project hien tai la pnpm workspace + Turborepo:

```txt
/
|-- apps/
|   |-- backend/
|   `-- storefront/
|-- docs/
|-- AGENTS.md
|-- package.json
|-- pnpm-workspace.yaml
`-- turbo.json
```

Backend giu Medusa module architecture:

```txt
apps/backend/src/
|-- admin/
|-- api/
|   |-- admin/
|   `-- store/
|-- data/
|-- lib/
|-- modules/
|-- scripts/
|   |-- maintenance/
|   |-- reset/
|   `-- seed/
|-- subscribers/
`-- workflows/
```

`apps/backend/src/scripts` dung cho seed/reset/maintenance script chay qua `medusa exec`. Database schema migrations that van nam trong `apps/backend/src/modules/*/migrations`.

Storefront giu Next.js App Router va feature modules:

```txt
apps/storefront/src/
|-- app/
|-- lib/
|-- modules/
|-- styles/
`-- types/
```

Trong `src/modules/*/components`, folder chi chua mot `index.tsx` nen duoc flatten thanh `component-name.tsx`. Cac component folder co nhieu file lien quan tiep tuc giu folder rieng.
