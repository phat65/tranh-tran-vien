# SYSTEM REQUIREMENTS

## Mục tiêu

Xây dựng website bán tranh / wall art cao cấp, visual-first, tập trung conversion, có storefront, cart, checkout handoff, account, search, collection, product detail và custom artwork flow.

Website tham khảo về UX: `animetalposter.com`.

Chỉ tham khảo:
- information architecture,
- layout rhythm,
- product discovery,
- navigation,
- product detail hierarchy,
- ecommerce interaction.

Không sao chép:
- thương hiệu,
- logo,
- hình ảnh,
- nội dung,
- mã nguồn,
- pixel-perfect styling.

## V1 Scope

- Homepage.
- Collection page.
- Search.
- Product detail.
- Cart drawer.
- Cart page.
- Checkout handoff.
- Custom artwork upload/configuration.
- Account entry.
- Track order entry.
- About/FAQ/Shipping/Refund/Contact.
- Responsive navigation.
- Footer.
- SEO metadata.
- Analytics hooks.
- Basic accessibility.

## Homepage

Thứ tự mặc định:

1. Announcement bar.
2. Header.
3. Hero.
4. Value proposition bar.
5. Shop by format.
6. Best sellers / New arrivals.
7. Featured campaign.
8. Video / UGC.
9. Featured collections.
10. Newsletter.
11. Footer.

## Header

Desktop:
- Logo.
- Home.
- Explore.
- Custom Art.
- Gallery.
- Track Order.
- About.
- Search.
- Account.
- Cart.

Mobile:
- Menu.
- Logo.
- Search.
- Cart.
- Account optional.

Header sticky, background solid, không dùng glass effect mặc định.

## Mega Menu

Nhóm:
- Shop by Format.
- Shop by Category.
- Popular Collections.
- Custom Products.
- Extras.

Desktop dùng mega panel.
Mobile dùng accordion/drawer.

## Product Card

Phải có:
- image,
- optional badge,
- title,
- price,
- compare-at price,
- optional review,
- optional quick add.

Card image giữ aspect-ratio cố định.

## Collection Page

Route:

`/collections/[slug]`

Có:
- breadcrumb,
- title,
- description optional,
- filter,
- sort,
- count,
- grid,
- pagination/load more.

Filter:
- category,
- format,
- size,
- price,
- availability,
- material.

## Product Detail

Route:

`/products/[slug]`

Desktop:
- gallery 55–65%,
- product info 35–45%.

Product info order:
1. eyebrow/category,
2. title,
3. rating,
4. price,
5. compare-at price,
6. material,
7. size,
8. size guide,
9. promotion,
10. quantity,
11. add to cart,
12. buy now,
13. shipping/payment reassurance.

## Custom Product Flow

Route:

`/custom`

Flow:
1. Upload.
2. Validate.
3. Preview.
4. Select format.
5. Select size.
6. Select material.
7. Crop/fit.
8. Final preview.
9. Add to cart.

Accepted default:
- JPEG,
- PNG,
- WEBP.

## Cart

Cart drawer:
- item count,
- product,
- variant,
- quantity,
- remove,
- price,
- subtotal,
- checkout CTA,
- continue shopping.

Add-to-cart mở cart drawer, không bắt buộc redirect.

## Responsive

Desktop:
- mega menu,
- full grid,
- PDP 2 columns.

Tablet:
- simplified nav,
- 3-column grid.

Mobile:
- drawer navigation,
- 2-column grid,
- PDP stack,
- full-width CTA,
- touch target >= 44px.

## Accessibility

Mục tiêu practical WCAG 2.1 AA:
- semantic HTML,
- keyboard navigation,
- visible focus,
- alt text,
- aria-expanded,
- modal focus trap,
- ESC close,
- accessible form errors.

## Performance

Mục tiêu:
- LCP < 2.5s.
- CLS < 0.1.
- INP < 200ms khi khả thi.

Ưu tiên:
- responsive images,
- lazy loading,
- route splitting,
- minimal third-party scripts,
- SSR/SSG khi phù hợp.

## SEO

Product:
- title,
- meta description,
- canonical,
- OpenGraph,
- Product structured data,
- Breadcrumb structured data.

Collection:
- title,
- description,
- canonical.

## Definition of Done

Feature hoàn thành khi:
- đúng scope,
- responsive,
- loading state,
- error/empty state nếu cần,
- accessibility cơ bản,
- type-check pass,
- lint pass,
- build pass,
- không phá feature hiện tại.
