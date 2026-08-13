# ENVIRONMENT

## Environments

Tối thiểu:
- development,
- production.

Khuyến nghị:
- development,
- staging,
- production.

Không dùng production DB cho local.

## Environment Variables

Tên thực tế tùy platform, nhưng nhóm bắt buộc:

### Storefront

```txt
NEXT_PUBLIC_STOREFRONT_URL
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_ANALYTICS_ID
```

### Backend

```txt
DATABASE_URL
REDIS_URL
STORE_CORS
ADMIN_CORS
AUTH_CORS
JWT_SECRET
COOKIE_SECRET
```

### Storage

```txt
S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_PUBLIC_BASE_URL
```

Nếu dùng R2:
- endpoint theo account.
- region/provider config theo SDK.

### Payment

```txt
PAYMENT_PROVIDER_KEY
PAYMENT_WEBHOOK_SECRET
```

Không prefix `NEXT_PUBLIC_` cho secret.

## Secrets

Không commit:
- `.env`,
- private keys,
- production credentials,
- webhook secrets.

Commit:
- `.env.example`.

## `.env.example`

Chỉ để placeholder, không chứa secret thật.

## Database

Development:
- local/container PostgreSQL hoặc managed dev DB.

Production:
- managed PostgreSQL.
- backups enabled.

## Storage Buckets

Khuyến nghị tách logic folder/prefix:

```txt
catalog/
customer-source/
artwork-preview/
artwork-approved/
production/
internal/
```

Private:
- customer-source,
- production,
- internal.

Public:
- catalog.

## CORS

Chỉ allow domain cần thiết.

Không dùng `*` cho authenticated production APIs.

## Logging

Production logs:
- request ID,
- error context,
- audit events.

Không log:
- password,
- token,
- secret,
- full payment credentials.

## Backups

Database:
- automated daily backup tối thiểu.
- retention theo ngân sách.

Storage:
- versioning hoặc backup strategy.

## Migrations

- migration phải versioned.
- không sửa migration đã chạy production.
- backup trước migration nguy hiểm.

## Deployment Checklist

- env validated.
- migrations run.
- seed production không chạy nhầm.
- build pass.
- health check pass.
- admin protected.
- storage permissions verified.
- CORS verified.
- webhook verified.
- backups enabled.

## Cloudflare R2 / Admin Uploads

Project uses Medusa file provider for image uploads. In production and shared environments, configure Cloudflare R2 with the `S3_*` variables in `apps/backend/.env` and expose the same public asset base to storefront through `NEXT_PUBLIC_STORAGE_PUBLIC_URL`.

Required for R2-backed public images:

```txt
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=<bucket-name>
S3_ACCESS_KEY_ID=<r2-access-key-id>
S3_SECRET_ACCESS_KEY=<r2-secret-access-key>
S3_FILE_URL=https://<public-r2-domain-or-custom-domain>
S3_PUBLIC_BASE_URL=https://<public-r2-domain-or-custom-domain>
S3_FORCE_PATH_STYLE=true
NEXT_PUBLIC_STORAGE_PUBLIC_URL=https://<public-r2-domain-or-custom-domain>
```

Images should be uploaded through Medusa admin upload or backend upload endpoints that use the Medusa file provider. Do not treat `apps/backend/static` as permanent product/customer image storage.
