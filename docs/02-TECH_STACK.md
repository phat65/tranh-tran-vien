# TECH STACK

## Stack chuẩn đề xuất

### Storefront
- Next.js App Router.
- TypeScript strict mode.
- React.
- Tailwind CSS.
- shadcn/ui hoặc component primitives hiện có.
- Server Components mặc định khi hợp lý.
- Client Components chỉ khi cần interaction.

### Commerce
- Medusa v2.
- Medusa Store API.
- Medusa Admin.
- Custom Medusa modules cho Artwork/Production.

### Database
- PostgreSQL.

### Storage
- Cloudflare R2 ưu tiên.
- S3-compatible alternative được chấp nhận.

### Cache / Queue
- Redis chỉ khi cần:
  - background jobs,
  - event processing,
  - queues,
  - caching.

Không thêm Redis chỉ vì “best practice”.

### Search
V1:
- database/commerce search có sẵn.

Khi catalog lớn:
- Meilisearch / Typesense / Algolia nếu thực sự cần.

### Payments
Adapter-based.
Có thể tích hợp:
- COD.
- Stripe.
- gateway địa phương.

Frontend không quyết định trạng thái thanh toán cuối cùng.

### Deployment

Storefront:
- Vercel.

Backend/Admin:
- Railway,
- Fly.io,
- Render,
- VPS,
- container platform phù hợp.

Database:
- managed PostgreSQL.

Storage:
- R2/S3.

## Package Rules

Không thêm package nếu:
- framework/platform đã có API native,
- utility có thể viết dưới 30–40 dòng ổn định,
- package chỉ dùng cho một interaction đơn giản.

Mọi dependency mới phải có lý do rõ ràng.

## TypeScript

- `strict: true`.
- Tránh `any`.
- Public APIs phải có type.
- Shared domain types đặt ở layer dùng chung.

## Styling

Không mix nhiều UI systems.

Storefront:
- Tailwind + component primitives.

Admin Medusa:
- ưu tiên Medusa UI.

## Architecture Principle

- Storefront không chứa commerce truth.
- Medusa xử lý commerce domain.
- Artwork/Production là custom domain.
- Storage tách khỏi DB.
- API layer tách khỏi UI.
- Không gọi raw database từ client.
