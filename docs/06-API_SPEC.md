# API SPEC

API phải tách khỏi UI.

## Storefront API Layer

```txt
lib/api/
├── products.ts
├── collections.ts
├── search.ts
├── cart.ts
├── account.ts
├── uploads.ts
└── orders.ts
```

## Storefront Contracts

### List image products

```http
GET /store/image-products
```

Supported catalog filters include `q`, `handle`, `image_id`, `parent_handle`,
`category_id`, `collection_id`, and parent `id`. The API:

- returns one record per active primary `ProductImage`;
- returns the primary image and its linked gallery images in `images`;
- inherits categories, collection, options, internal variants, and calculated
  price from the parent Product;
- filters parent products by published status and the publishable key's sales
  channels;
- returns canonical image metadata and `parent_product_id`.

Store/category/collection grids consume this endpoint. Explore navigation is a
thin adapter over native Medusa Categories and Collections. Native
`/store/products` remains the commerce source for retrieving a parent product
and its internal variant.

### Native quantity price projection

```http
GET /store/quantity-prices?variant_id=variant_...&region_id=reg_...
```

This read-only endpoint returns eligible quantity tiers calculated from native
Medusa Price Lists for the requested variant and pricing context. It does not
create a second pricing engine; Medusa remains authoritative for cart and
checkout totals.

### SePay direct QR

The SePay payment session returns public `checkout_fields` containing the QR
URL, receiving bank/account, exact amount, and transfer content. There is no
hosted SePay checkout redirect. Medusa's payment webhook receives the signed
SePay bank event and marks the matching session paid only after account and
amount validation.

### Get Product

```ts
getProduct(slug: string): Promise<Product>
```

Errors:

- `NOT_FOUND`
- `NETWORK_ERROR`

### Get Collection

```ts
getCollection(
  slug: string,
  filters: CollectionFilters
): Promise<CollectionResult>
```

### Search

```ts
searchProducts(query: string): Promise<SearchResult>
```

Search input phải debounce 250–400ms.

### Cart

```ts
addCartItem(input);
updateCartItem(input);
removeCartItem(id);
getCart();
```

Backend quyết định:

- final price,
- discount,
- inventory,
- cart totals.

### Upload Custom Artwork

Flow gợi ý:

1. Request upload session.
2. Upload trực tiếp tới signed URL.
3. Confirm upload.
4. Tạo artwork metadata.

Không proxy file lớn qua frontend nếu không cần.

## Admin API Layer

```txt
lib/admin-api/
├── products.ts
├── collections.ts
├── orders.ts
├── customers.ts
├── artwork.ts
├── production.ts
├── uploads.ts
├── staff.ts
└── reports.ts
```

## Artwork Admin API

```ts
getArtwork(id);
listArtwork(filters);
uploadArtworkPreview(id, file);
setApprovedArtworkVersion(id, versionId);
addArtworkNote(id, note);
```

## Production API

```ts
listProductionJobs(filters);
getProductionJob(id);
updateProductionStatus(id, nextStatus);
assignProductionStaff(id, staffId);
```

Backend phải validate transition.

## Error Shape

Chuẩn hóa:

```ts
type ApiError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
};
```

Không trả raw stack trace cho client production.

## Status Codes

- 200 success.
- 201 created.
- 204 no content.
- 400 validation.
- 401 unauthenticated.
- 403 unauthorized.
- 404 not found.
- 409 conflict / invalid transition.
- 422 domain validation nếu framework dùng.
- 500 unexpected server error.

## Idempotency

Các action quan trọng nên có idempotency khi provider/framework hỗ trợ:

- payment,
- checkout,
- refund,
- order creation,
- webhook handling.

## API Security

- Server-side auth.
- Server-side permission.
- Validate payload schema.
- Rate limit upload/search/login nếu cần.
- Không trust client price.
- Signed URL cho private file.
