# Wall Art Ecommerce Project

Bộ tài liệu kỹ thuật cho website thương mại điện tử tranh / wall art, gồm storefront, admin, custom artwork và production workflow.

## Thứ tự đọc

1. `AGENTS.md`
2. `docs/01-SYSTEM_REQUIREMENTS.md`
3. `docs/02-TECH_STACK.md`
4. `docs/03-PROJECT_STRUCTURE.md`
5. `docs/04-DESIGN_SYSTEM.md`
6. `docs/05-DATABASE_SCHEMA.md`
7. `docs/06-API_SPEC.md`
8. `docs/07-BUSINESS_RULES.md`
9. `docs/08-AUTH_AND_PERMISSIONS.md`
10. `docs/09-ADMIN_SYSTEM_REQUIREMENTS.md`
11. `docs/10-TESTING_REQUIREMENTS.md`
12. `docs/11-IMPLEMENTATION_PLAN.md`
13. `docs/12-ENVIRONMENT.md`

## Nguyên tắc

- Storefront ưu tiên trải nghiệm mua hàng và hình ảnh sản phẩm.
- Commerce engine là source of truth cho giá, tồn kho, order và promotion.
- Custom Artwork và Production là domain riêng.
- Admin phải phục vụ vận hành, không phải marketing.
- AI coding agent không được tự mở rộng scope.
- Mọi thay đổi phải tuân thủ `AGENTS.md`.

## Stack mặc định

- Next.js
- TypeScript
- Tailwind CSS
- Medusa v2
- PostgreSQL
- Cloudflare R2 / S3-compatible storage
- Redis khi cần queue/job
- Vercel cho storefront
- Railway/VPS/Fly.io/Render cho backend/admin

Nếu project thực tế đã dùng stack khác, không tự migration chỉ vì tài liệu này.
