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
addCartItem(input)
updateCartItem(input)
removeCartItem(id)
getCart()
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
getArtwork(id)
listArtwork(filters)
uploadArtworkPreview(id, file)
setApprovedArtworkVersion(id, versionId)
addArtworkNote(id, note)
```

## Production API

```ts
listProductionJobs(filters)
getProductionJob(id)
updateProductionStatus(id, nextStatus)
assignProductionStaff(id, staffId)
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
