# ADMIN SYSTEM REQUIREMENTS

## Mục tiêu

Admin phục vụ vận hành:

- catalog,
- order,
- customer,
- artwork,
- production,
- inventory,
- shipping,
- promotion,
- staff.

Ưu tiên:

- nhanh,
- rõ,
- ít click,
- tránh sai,
- dễ đào tạo.

## Sidebar

```txt
Dashboard

Catalog
├── Products
├── Collections
├── Categories
├── Materials
├── Sizes
└── Inventory

Orders
├── All Orders
├── New Orders
├── Processing
├── Ready to Ship
└── Returns

Custom Artwork
├── All
├── File Review
├── Design Processing
├── Waiting Approval
├── Approved
├── Printing
├── Framing
├── Quality Check
└── Completed

Customers

Marketing
├── Promotions
├── Discount Codes
└── Campaigns

Content
├── Homepage
├── Banners
├── FAQs
└── SEO

Reports

Staff
├── Users
├── Roles
└── Activity Log

Settings
```

## Dashboard KPI

- Revenue today.
- New orders.
- Processing.
- Waiting approval.
- Printing.
- Ready to ship.
- Overdue.
- Low stock.

Dashboard phải drill-down được.

## Product List

Columns:

- thumbnail,
- name,
- SKU,
- category,
- price,
- inventory,
- status,
- updated at.

Có:

- search,
- filter,
- sort,
- pagination,
- bulk publish,
- bulk collection assignment.

Không bulk delete mặc định.

## Product Edit

For a printable album, Product Edit must include an `Image products` section.
Admin can upload multiple ProductImages and edit each image's storefront name,
unique handle, code, alt text, active state, and order. Upload derives safe
defaults from the filename; an operator can edit them before publishing.

Each image must be marked `primary` or `gallery`. A gallery image must select
its owning primary image. Admin supports selecting individual/all images and
bulk deletion; deleting a primary with linked gallery images must be explicit.

Category and Collection are edited with Medusa's native Product fields. Admin
must not assign a second Explore taxonomy to the same Product.

Deleting or hiding an image affects future storefront visibility only. Existing
orders keep their immutable line-item snapshot.

Sections:

- basic info,
- media,
- commerce,
- options,
- SEO.

Options:

- material,
- size,
- frame,
- format.

## Orders

Search:

- order number,
- phone,
- email,
- customer,
- tracking.

Filters:

- payment,
- order,
- production,
- shipping,
- date.

## Order Detail

Sections:

- customer,
- items,
- payment,
- shipping,
- production,
- timeline,
- notes.

Custom item hiển thị:

- source file,
- preview,
- approved file,
- production file,
- instructions.

## Artwork Module

Route:
`/admin/custom-artwork`

Phải hỗ trợ:

- list/filter,
- detail,
- version history,
- upload preview,
- approve version,
- revision note,
- assign staff,
- production linkage.

## Production Board

Optional phase sau.

Columns:

- file review,
- design,
- waiting approval,
- printing,
- framing,
- QC,
- packing,
- ready.

Backend validate transition kể cả khi UI drag-drop.

## Staff

Fields:

- name,
- email,
- role,
- status,
- last login.

Actions:

- invite,
- disable,
- change role,
- revoke sessions.

## Activity Log

Log action quan trọng:

- product update,
- order status,
- refund,
- production transition,
- role change,
- artwork approval.

Không log mọi page view.

## Dangerous Actions

Confirmation required:

- refund,
- cancel,
- delete/archive,
- role change,
- disable staff,
- artwork deletion.

## Admin Mobile

Không cần mobile-first, nhưng phải dùng được cho:

- order lookup,
- status update,
- tracking,
- notes,
- customer contact.
