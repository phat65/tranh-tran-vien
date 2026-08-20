# DATABASE SCHEMA

Tài liệu này mô tả logical schema. Nếu Medusa đã có entity tương đương, dùng entity native thay vì duplicate.

## Core Commerce

Medusa là source of truth cho:
- Product.
- Product Variant.
- Customer.
- Cart.
- Order.
- Payment.
- Inventory.
- Promotion.
- Fulfillment.

Không rebuild các bảng này nếu framework đã quản lý.

### PayOS Integration State

PayOS does not create a separate Payment or Order table. The
`payos_payment_attempt` table only maps a PayOS `order_code` to a Medusa
`payment_session_id` for idempotent webhook processing. Medusa remains the
source of truth for payment and order state.

## Product Extensions

### Catalog album and image products

For the printable catalog, native Medusa entities have these roles:

- `Product` is the album/group and owns categories, collection, description,
  price configuration, and the internal commerce variant.
- Each native `ProductImage` is projected as one storefront image product.
- `ProductImage.metadata` stores `title`, `handle`, `code`, `active`, `alt`, and
  `original_filename`.
- The image is not a Medusa variant. Cart and checkout still use the parent
  product's internal variant.
- Cart/order line metadata snapshots the image ID, name, code, URL, virtual
  handle, and parent product ID so production can identify the selected print.

The native `ProductImage.id` is the stable catalog-image identity. A URL or
image rank must not be used as the identity.

Các metadata/custom relation có thể gồm:
- material,
- size,
- frame,
- format,
- artwork compatibility.

## Material

```ts
type Material = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnailUrl?: string;
  active: boolean;
  sortOrder: number;
};
```

## Size

```ts
type Size = {
  id: string;
  label: string;
  width: number;
  height: number;
  unit: "cm" | "mm" | "inch";
  aspectRatio?: string;
  active: boolean;
  sortOrder: number;
};
```

## Frame

```ts
type Frame = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sortOrder: number;
};
```

## Artwork

```ts
type Artwork = {
  id: string;
  orderId: string;
  orderItemId: string;
  customerId?: string;

  sourceFileKey?: string;
  previewFileKey?: string;
  approvedFileKey?: string;
  productionFileKey?: string;

  instructions?: string;

  width?: number;
  height?: number;
  unit?: "cm" | "mm" | "inch";

  materialId?: string;
  sizeId?: string;
  frameId?: string;

  status: ProductionStatus;

  assignedTo?: string;

  customerApprovedAt?: Date;
  productionStartedAt?: Date;
  productionCompletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};
```

## Artwork Version

Không ghi đè preview cũ.

```ts
type ArtworkVersion = {
  id: string;
  artworkId: string;
  version: number;
  type: "source" | "preview" | "approved" | "production";
  fileKey: string;
  createdBy?: string;
  createdAt: Date;
};
```

## Production Job

```ts
type ProductionJob = {
  id: string;
  artworkId: string;
  orderItemId: string;

  status: ProductionStatus;

  assignedTo?: string;
  dueAt?: Date;

  startedAt?: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};
```

## Production Status

```ts
type ProductionStatus =
  | "waiting_for_file"
  | "file_received"
  | "file_review"
  | "design_processing"
  | "waiting_customer_approval"
  | "approved"
  | "printing"
  | "framing"
  | "quality_check"
  | "packing"
  | "ready_to_ship"
  | "completed"
  | "on_hold"
  | "cancelled";
```

## Internal Note

```ts
type InternalNote = {
  id: string;
  entityType: "order" | "artwork" | "production_job" | "customer";
  entityId: string;
  authorId: string;
  body: string;
  attachmentKey?: string;
  createdAt: Date;
};
```

## Audit Log

```ts
type AuditLog = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};
```

## Relationships

```txt
Order
 └── Order Item
      └── 0..1 Artwork
           ├── 1..n Artwork Versions
           └── 0..1 Production Job
```

Một order có thể có nhiều artwork vì relation nằm ở Order Item.

## Indexes

Index các field thường search/filter:
- orderId,
- orderItemId,
- customerId,
- status,
- assignedTo,
- dueAt,
- createdAt.

Không tạo index mọi column.

## Storage

DB lưu metadata/object key.
Binary file nằm ở R2/S3.

Private files:
- customer upload,
- production file,
- internal attachment.

Public files:
- catalog images,
- marketing assets được duyệt.
