# DESIGN SYSTEM

## Direction

- Premium.
- Minimal.
- Editorial.
- Visual-first.
- High contrast.
- Spacious.
- Conversion-focused.

Không:
- neon,
- glassmorphism,
- excessive gradients,
- rounded-everything,
- heavy shadows,
- SaaS dashboard look trên storefront.

## Tokens

```css
:root {
  --color-bg: #ffffff;
  --color-bg-subtle: #f6f6f6;
  --color-surface: #ffffff;

  --color-text: #111111;
  --color-text-muted: #666666;
  --color-border: #dedede;

  --color-primary: #111111;
  --color-primary-foreground: #ffffff;

  --color-sale: #b42318;
  --color-success: #067647;
  --color-warning: #b54708;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;

  --container-max: 1440px;
}
```

Brand color chỉ đổi ở token layer.

## Typography

Tối đa 2 font family.

Default:
```css
--font-body: "Inter", "Helvetica Neue", Arial, sans-serif;
--font-display: var(--font-body);
```

Font weights:
- 400,
- 500,
- 600,
- 700.

## Spacing

Allowed scale:
```txt
4
8
12
16
20
24
32
40
48
64
80
96
120
```

Không dùng spacing ngẫu nhiên nếu không có lý do.

## Section Spacing

Desktop:
80–120px.

Tablet:
64–80px.

Mobile:
48–64px.

## Container

Desktop padding:
32px.

Tablet:
24px.

Mobile:
16px.

## Grid

Desktop large:
4–5 columns.

Desktop:
4.

Tablet:
3.

Mobile:
2.

## Buttons

Variants:
- primary,
- secondary,
- ghost,
- icon.

Sizes:
- sm,
- md,
- lg.

Không tạo button variant tùy tiện.

## Product Card

- image-first,
- no heavy shadow,
- title tối đa 2 dòng,
- consistent image ratio,
- subtle hover only,
- sale price semantic.

## Motion

Allowed:
- opacity,
- translate 4–12px,
- small scale,
- drawer slide,
- accordion,
- image fade.

UI duration:
120–250ms.

Tôn trọng `prefers-reduced-motion`.

## Images

- Có width/height hoặc aspect-ratio.
- Hero priority.
- Grid lazy-load.
- Alt text.
- Responsive sizes.
- AVIF/WebP khi pipeline hỗ trợ.

## Admin UI

Admin ưu tiên:
- clarity,
- density,
- speed,
- status visibility.

Admin không bắt buộc dùng storefront design system.
Nếu Medusa Admin:
- ưu tiên Medusa UI.
