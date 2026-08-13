# AUTH AND PERMISSIONS

## Authentication Domains

Tách:
- Customer authentication.
- Admin/staff authentication.

Không dùng customer session để truy cập admin.

## Customer

Customer có thể:
- xem profile,
- xem order của chính mình,
- xem custom artwork của chính mình,
- upload/review file khi flow cho phép,
- approve/revision artwork khi có token/session hợp lệ.

Không thể xem order của customer khác.

## Admin Roles

- Super Admin.
- Admin.
- Sales.
- Designer.
- Production.
- Warehouse.
- Customer Support.
- Viewer.

## Permission Matrix

### Super Admin
Full access.

### Admin
Gần full access, trừ infrastructure secret nếu platform tách riêng.

### Sales
Có thể:
- orders,
- customers,
- draft order,
- discount trong giới hạn.

Không:
- staff role management,
- system secrets,
- production file modification nếu không cần.

### Designer
Có thể:
- artwork assigned,
- source download,
- preview upload,
- design status,
- notes.

Không:
- refund,
- revenue dashboard nhạy cảm,
- product pricing.

### Production
Có thể:
- approved production jobs,
- printing/framing/QC/packing status,
- notes.

Không:
- payment,
- customer pricing,
- promotion settings.

### Warehouse
Có thể:
- inventory,
- packing,
- shipping,
- tracking.

### Customer Support
Có thể:
- customer,
- order lookup,
- notes,
- tracking,
- approval follow-up.

### Viewer
Read-only theo phạm vi được cấp.

## Server-side Authorization

Mọi admin mutation:
- xác thực session,
- check permission server-side,
- validate entity ownership/scope nếu có.

Ẩn button ở UI không phải security.

## Sensitive Actions

Yêu cầu permission + confirmation + audit:
- refund,
- cancel order,
- role change,
- disable staff,
- delete/archive product,
- override production transition.

## Sessions

- Secure cookie.
- HttpOnly khi phù hợp.
- SameSite phù hợp.
- Rotate/revoke session khi security event.

## Login Protection

- Rate limit.
- Generic error message.
- Không tiết lộ user có tồn tại hay không.
- MFA có thể bổ sung cho admin nếu môi trường yêu cầu.

## File Access

Private file phải dùng:
- signed URL,
- authenticated proxy,
- hoặc storage access control.

Signed URL phải có TTL ngắn hợp lý.
