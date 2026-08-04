# Prompt — Xây dựng cấu trúc nền móng dự án Tranh Tràn Viền

## Cách sử dụng

Dùng prompt này với AI coding agent như Cursor, Claude Code, Codex, Copilot Agent hoặc một hệ thống có khả năng đọc và tạo file trong repository.

Nên cung cấp thêm file `project-context.md` cùng prompt này.

---

## Prompt chính

Bạn là một Senior Software Architect và Senior Full-stack TypeScript Engineer.

Nhiệm vụ của bạn là xây dựng **nền móng repository và cấu trúc code ban đầu** cho dự án thương mại điện tử **Tranh Tràn Viền**.

Hãy đọc kỹ file `project-context.md` trước khi thực hiện.

Dự án là một hệ thống thương mại điện tử có thể mở rộng nhiều dòng sản phẩm và nhiều thương hiệu phụ. Không được thiết kế toàn bộ hệ thống chỉ xoay quanh Pokémon.

## 1. Technology stack bắt buộc

Sử dụng:

- TypeScript.
- Node.js phiên bản LTS.
- pnpm Workspace.
- Turborepo.
- Next.js App Router cho storefront.
- React.
- Medusa v2 cho commerce backend.
- PostgreSQL.
- Redis.
- Tailwind CSS.
- shadcn/ui.
- React Hook Form.
- Zod.
- Vitest.
- Playwright.
- Docker Compose.
- ESLint.
- Prettier.

Chưa triển khai Three.js trong giai đoạn foundation.

Không sử dụng microservices.

Kiến trúc backend là modular monolith.

---

## 2. Mục tiêu của lần triển khai này

Chỉ xây dựng foundation và skeleton code.

Chưa cần hoàn thiện toàn bộ chức năng kinh doanh.

Kết quả cần có:

1. Monorepo hoạt động.
2. Storefront Next.js chạy được.
3. Medusa backend chạy được.
4. PostgreSQL và Redis chạy bằng Docker Compose.
5. Shared packages được thiết lập.
6. TypeScript strict mode.
7. ESLint và Prettier hoạt động.
8. Environment validation bằng Zod.
9. Lint, typecheck, test và build chạy được.
10. Có health check cho storefront và backend.
11. Có cấu trúc custom modules.
12. Có cấu trúc workflows.
13. Có cấu trúc admin extensions.
14. Có tài liệu kiến trúc ban đầu.
15. Có seed data placeholder.
16. Có GitHub Actions CI.
17. Có `.env.example`.
18. Có README hướng dẫn chạy local.

---

## 3. Cấu trúc repository mong muốn

Tạo cấu trúc gần với mẫu sau:

```text
tranh-tran-vien/
├── apps/
│   ├── storefront/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── styles/
│   │   │   └── types/
│   │   ├── public/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── commerce/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── workflows/
│   │   │   ├── api/
│   │   │   ├── admin/
│   │   │   ├── subscribers/
│   │   │   ├── jobs/
│   │   │   ├── links/
│   │   │   └── scripts/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── media-worker/
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── ui/
│   ├── contracts/
│   ├── validation/
│   ├── sdk/
│   ├── analytics/
│   ├── eslint-config/
│   ├── typescript-config/
│   └── test-utils/
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── monitoring/
│   └── backup/
│
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── database/
│   ├── api/
│   └── business-rules/
│
├── scripts/
├── .github/
│   └── workflows/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

Có thể điều chỉnh một số thư mục nếu framework yêu cầu, nhưng phải giải thích lý do.

---

## 4. Cấu trúc storefront

Trong `apps/storefront/src`, tạo skeleton:

```text
app/
├── (store)/
│   ├── page.tsx
│   ├── san-pham/
│   ├── danh-muc/
│   ├── thuong-hieu/
│   ├── poke-framium/
│   ├── thiet-ke-theo-yeu-cau/
│   ├── feedback/
│   ├── blog/
│   └── lien-he/
├── (checkout)/
│   ├── gio-hang/
│   ├── thanh-toan/
│   └── dat-hang-thanh-cong/
├── (account)/
│   ├── dang-nhap/
│   ├── dang-ky/
│   └── tai-khoan/
├── api/
├── sitemap.ts
└── robots.ts
```

Tạo thêm:

```text
features/
├── catalog/
├── product/
├── cart/
├── checkout/
├── customer/
├── wishlist/
├── custom-design/
├── feedback/
└── content/

components/
├── common/
├── layout/
├── commerce/
└── design-studio/

lib/
├── medusa/
├── env/
├── storage/
├── seo/
├── analytics/
└── zalo/
```

Mỗi thư mục feature cần có file README ngắn giải thích trách nhiệm.

Không đưa tất cả logic vào `components`.

---

## 5. Cấu trúc commerce backend

Trong `apps/commerce/src`, tạo skeleton:

```text
modules/
├── brand/
├── taxonomy/
├── custom-design/
├── gift-rule/
├── shipping-rule/
├── feedback/
├── content/
├── navigation/
├── site-setting/
└── audit-log/

workflows/
├── create-design-request/
├── attach-design-to-cart/
├── complete-custom-order/
├── apply-gift-rules/
├── calculate-shipping/
└── publish-feedback/

api/
├── store/
└── admin/

admin/
├── routes/
├── widgets/
└── components/

subscribers/
├── order-placed.ts
├── payment-captured.ts
└── design-submitted.ts

jobs/
├── cleanup-expired-uploads.ts
├── generate-design-preview.ts
└── promotion-status-sync.ts
```

Trong giai đoạn này chỉ cần:

- Tạo module skeleton.
- Tạo interface.
- Tạo service placeholder.
- Tạo README cho từng module.
- Không cần implement đầy đủ nghiệp vụ.
- Không tạo database schema sai với quy ước Medusa.
- Không tự xây lại product, cart, order, customer và promotion core.

---

## 6. Shared packages

### `packages/contracts`

Chứa TypeScript types và DTO dùng chung.

Tạo cấu trúc:

```text
src/
├── brand/
├── taxonomy/
├── product/
├── custom-design/
├── feedback/
├── navigation/
├── common/
└── index.ts
```

Tạo một số type mẫu:

- `ApiResponse<T>`.
- `PaginatedResponse<T>`.
- `BrandSummary`.
- `TaxonomyTermSummary`.
- `DesignRequestStatus`.
- `DesignAsset`.
- `NavigationItem`.
- `SiteSettingPublic`.

Không import trực tiếp code backend vào storefront.

---

### `packages/validation`

Chứa Zod schemas dùng chung.

Tạo:

- Environment schema.
- Pagination schema.
- Upload request schema.
- Design request schema placeholder.
- Contact/Zalo payload schema.
- Public settings schema.

---

### `packages/ui`

Chứa component dùng chung.

Tạo tối thiểu:

- Button.
- Input.
- Container.
- Section.
- Badge.
- PriceDisplay.
- EmptyState.
- LoadingState.

Không viết business logic trong package UI.

---

### `packages/sdk`

Tạo HTTP client abstraction cho storefront giao tiếp với commerce backend.

Yêu cầu:

- Base URL từ environment.
- Timeout.
- Error normalization.
- Request ID.
- Generic GET, POST, PATCH và DELETE.
- Không hard-code endpoint trong component.

---

### `packages/analytics`

Tạo interface:

```ts
export interface AnalyticsProvider {
  track(event: string, payload?: Record<string, unknown>): void
  identify?(userId: string, traits?: Record<string, unknown>): void
}
```

Tạo composite provider placeholder.

Chưa cần tích hợp thật Google Analytics, Meta Pixel hoặc TikTok Pixel.

---

## 7. Environment variables

Tạo `.env.example`.

Tối thiểu gồm:

```env
NODE_ENV=development

STOREFRONT_URL=http://localhost:3000
COMMERCE_URL=http://localhost:9000
NEXT_PUBLIC_COMMERCE_URL=http://localhost:9000

DATABASE_URL=postgres://postgres:postgres@localhost:5432/tranh_tran_vien
REDIS_URL=redis://localhost:6379

JWT_SECRET=change-me
COOKIE_SECRET=change-me

S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=

SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_TIKTOK_PIXEL_ID=
```

Tạo validation riêng cho:

- Storefront environment.
- Commerce environment.
- Worker environment.

Không expose secret sang `NEXT_PUBLIC_*`.

---

## 8. Docker Compose

Tạo `docker-compose.yml` có:

- PostgreSQL.
- Redis.

Có:

- Health check.
- Named volume.
- Network riêng.
- Port có thể override bằng environment.
- Restart policy phù hợp local.
- Không chứa production secret.

Có thể bổ sung MinIO cho local development nếu cần, nhưng không bắt buộc.

---

## 9. Health check

### Storefront

Tạo endpoint:

```text
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "service": "storefront"
}
```

### Commerce

Tạo endpoint health phù hợp cơ chế Medusa.

Response cần có:

```json
{
  "status": "ok",
  "service": "commerce"
}
```

Không trả secret hoặc thông tin nhạy cảm.

---

## 10. Logging và error handling

Tạo abstraction logging cơ bản.

Yêu cầu:

- Structured log dạng object.
- Có level.
- Có request ID nếu có.
- Không log password.
- Không log token.
- Không log URL private upload.
- Không log ảnh hoặc nội dung thiết kế khách hàng.

Tạo error type chung:

- `AppError`.
- `ValidationError`.
- `NotFoundError`.
- `UnauthorizedError`.
- `ConflictError`.

Không để frontend hiển thị raw stack trace.

---

## 11. CI

Tạo GitHub Actions workflow chạy khi pull request và push vào branch chính.

Các bước:

1. Checkout.
2. Setup Node.js.
3. Setup pnpm.
4. Cache dependencies.
5. Install.
6. Lint.
7. Typecheck.
8. Unit test.
9. Build.

Không deploy production trong workflow foundation.

---

## 12. Testing foundation

Tạo test mẫu:

- Validation schema test.
- SDK error normalization test.
- Storefront health route test nếu phù hợp.
- Một Playwright smoke test mở trang chủ.
- Một test kiểm tra navigation cơ bản.

Các test cần chạy được, không tạo test giả luôn pass.

---

## 13. Documentation

Tạo:

```text
docs/architecture/system-overview.md
docs/architecture/module-boundaries.md
docs/database/domain-model.md

docs/adr/ADR-001-medusa-commerce.md
docs/adr/ADR-002-modular-monolith.md
docs/adr/ADR-003-postgresql.md
docs/adr/ADR-004-object-storage.md
docs/adr/ADR-005-combo-as-variant.md
docs/adr/ADR-006-preview-2d-before-3d.md
```

Mỗi ADR gồm:

- Context.
- Decision.
- Alternatives considered.
- Consequences.
- Status.

---

## 14. README

Root `README.md` cần có:

- Tổng quan dự án.
- Technology stack.
- Prerequisites.
- Cách install.
- Cách copy environment.
- Cách chạy PostgreSQL và Redis.
- Cách chạy migration.
- Cách seed.
- Cách chạy storefront.
- Cách chạy commerce backend.
- Cách chạy toàn bộ monorepo.
- Cách chạy lint.
- Cách chạy typecheck.
- Cách chạy test.
- Cách build.
- Port mặc định.
- Troubleshooting cơ bản.

Các command phải đúng với `package.json`.

---

## 15. Root scripts

Root `package.json` cần có các scripts tương tự:

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

Điều chỉnh theo framework thực tế nhưng phải giữ khả năng chạy thống nhất từ root.

---

## 16. Quy tắc code

Bắt buộc:

- TypeScript strict mode.
- Không dùng `any` nếu không có lý do rõ ràng.
- Không hard-code giá.
- Không hard-code promotion.
- Không hard-code freeship.
- Không hard-code quà tặng.
- Không hard-code Zalo.
- Không hard-code Mega Menu.
- Không thiết kế domain chỉ cho Pokémon.
- Không tự viết lại commerce core đã có trong Medusa.
- Không lưu upload vào PostgreSQL dưới dạng binary.
- Không đưa secret sang client.
- Không để package UI phụ thuộc commerce backend.
- Không tạo circular dependency.
- Không tạo microservice trong foundation.
- Không viết business logic trong route handler nếu có thể đặt trong service hoặc workflow.
- Mọi API payload phải validation.
- Mọi environment variable phải validation.
- Tên file và folder dùng `kebab-case`.
- Type và class dùng `PascalCase`.
- Function và variable dùng `camelCase`.
- Constant dùng `UPPER_SNAKE_CASE` khi phù hợp.

---

## 17. Nguyên tắc bảo mật

- Không commit `.env`.
- Không commit secret.
- Không log credential.
- Không expose database URL.
- Không expose Redis URL.
- Không expose S3 secret.
- Không dùng public bucket cho file thiết kế khách hàng.
- Chuẩn bị abstraction cho presigned upload.
- Không tin giá hoặc promotion từ frontend.
- Backend là nguồn sự thật cho commerce calculation.
- Thêm security headers cơ bản cho storefront.
- Cấu hình CORS rõ ràng.
- Không dùng wildcard CORS trong production config.

---

## 18. Seed data foundation

Tạo seed placeholder hoặc seed tối thiểu cho development:

### Brand

- Tranh Tràn Viền.
- POKE Framium, parent là Tranh Tràn Viền.

### Product groups

- Tranh lục giác hợp kim.
- POKE Framium lục giác.
- POKE Framium acrylic.

### Tranh lục giác variants

- 1 tranh.
- Combo 3.
- Combo 5.
- Combo 9.
- Combo 10.
- Combo 15.
- Combo 20.

### Metadata

Combo 9 và combo 15 có:

```json
{
  "is_recommended": true
}
```

Không cần hoàn thiện image asset.

Nếu seed theo Medusa cần thêm region, currency hoặc sales channel, hãy tạo cấu hình development tối thiểu phù hợp Việt Nam và dùng tiền tệ VND.

---

## 19. Expected output

Sau khi hoàn thành, hãy cung cấp:

1. Danh sách file đã tạo.
2. Cây thư mục cuối cùng.
3. Giải thích ngắn các quyết định kiến trúc.
4. Các command để chạy local.
5. Các command để lint, typecheck, test và build.
6. Những phần chỉ là placeholder.
7. Những vấn đề chưa hoàn thành.
8. Những bước tiếp theo được đề xuất.

---

## 20. Cách thực hiện

Thực hiện theo thứ tự:

1. Kiểm tra repository hiện tại.
2. Không xóa file hiện có nếu không cần.
3. Lập kế hoạch thay đổi.
4. Tạo monorepo foundation.
5. Cài dependency.
6. Tạo cấu hình.
7. Tạo source skeleton.
8. Tạo test.
9. Chạy lint.
10. Chạy typecheck.
11. Chạy test.
12. Chạy build.
13. Sửa lỗi phát sinh.
14. Cập nhật README.
15. Báo cáo kết quả.

Không chỉ in ra code minh họa trong chat.

Hãy trực tiếp tạo và chỉnh sửa file trong repository.

Nếu một dependency hoặc API của framework đã thay đổi, hãy sử dụng cách phù hợp với phiên bản đang cài thay vì cố bám theo ví dụ cũ.

Không giả định lệnh đã chạy thành công. Phải thực sự chạy các command kiểm tra và báo rõ lỗi nếu còn tồn tại.

---

# Prompt bổ sung cho lần tiếp theo

Sau khi foundation hoàn thành, có thể dùng prompt sau:

```text
Hãy đọc project-context.md và toàn bộ tài liệu trong docs/.

Tiếp tục triển khai Sprint 2 — Catalog và Admin cho dự án Tranh Tràn Viền.

Mục tiêu:
- Brand Module.
- Taxonomy Module.
- Liên kết brand với product.
- Liên kết taxonomy với product.
- Site Settings Module.
- Navigation Module.
- Seed dữ liệu thương hiệu và danh mục.
- Store API đọc brand, taxonomy và menu.
- Admin API quản lý brand, taxonomy và menu.
- Admin extensions cơ bản.
- Unit test và integration test.
- Migration đầy đủ.
- Không hard-code dữ liệu thương hiệu hoặc menu trong storefront.

Trước khi code:
1. Phân tích structure hiện tại.
2. Đề xuất database model.
3. Chỉ ra phần dùng Medusa core và phần custom.
4. Sau đó mới triển khai.
```
