# BUSINESS RULES

Đây là source of truth cho business logic ngoài commerce framework.

## Product

For the printable catalog, a Medusa Product is an album/collection of designs,
not one storefront card. Every active primary ProductImage is one virtual
storefront product. Gallery ProductImages are supporting media linked to one
primary and never create their own storefront card. All images inherit the
parent Product's category, Medusa collection, price, options, and production
method.

The parent must retain at least one internal variant for Medusa pricing and
checkout. Images must not be modeled as variants.

All printable image products are made-to-order. Their internal variants use
`manage_inventory = false` and `allow_backorder = true`; fulfillment begins
only after the order identifies the selected ProductImage.

Quantity tiers are native Medusa Price List prices attached to the parent
Product's internal variant. The configured amount is the actual unit price for
its `min_quantity`/`max_quantity` range. Storefront may display these calculated
tiers but must not calculate or override checkout pricing.

Medusa applies native quantity pricing per line item/variant quantity. Different
virtual image products stay as separate cart lines so their selected image
metadata remains unambiguous; their quantities are not aggregated by a custom
rule. Custom Combo Rule, Gift Rule, and Shipping Rule modules are not part of the
system. Promotions and shipping methods remain native Medusa responsibilities.

Explore is storefront navigation only. It reads native Categories and
Collections and must not introduce a second catalog-assignment system.

Một product có thể có:

- material,
- size,
- frame,
- format.

Không phải product nào cũng hỗ trợ mọi option.

Frontend chỉ render combination backend cho phép.

## Pricing

Giá cuối cùng do backend/commerce engine tính.

Frontend không:

- tự tính discount cuối cùng,
- tự quyết định tax,
- tự quyết định shipping fee,
- tự trust price từ client.

## Variant

Variant được xác định từ option hợp lệ.

Ví dụ:
`Metal + 50x30 + Black Frame`.

Variant disabled/out-of-stock không add-to-cart được.

## Inventory

Nếu `trackInventory = true`:

- backend check stock,
- cart/checkout không được vượt available stock.

Nếu product made-to-order:

- có thể `trackInventory = false`.

## Promotions

Promotion phải đến từ backend/config.

Types:

- percentage,
- fixed amount,
- free shipping,
- volume discount.

Không hard-code campaign vào component.

## Custom Artwork

Custom product phải có:

- source file hợp lệ,
- configuration hợp lệ,
- metadata liên kết order item.

Customer upload không mặc định public.

## Artwork Approval

Approval states:

- not_sent,
- sent,
- approved,
- revision_requested.

Không được chuyển production sang `printing` khi artwork chưa `approved`, trừ manager/admin override có audit log.

## Production Status

Flow chuẩn:

```txt
waiting_for_file
→ file_received
→ file_review
→ design_processing
→ waiting_customer_approval
→ approved
→ printing
→ framing
→ quality_check
→ packing
→ ready_to_ship
→ completed
```

Có:

- on_hold,
- cancelled.

## Status Transition

Mặc định chỉ cho phép chuyển sang bước kế tiếp hoặc bước đặc biệt hợp lệ.

Không nhảy tự do.

Manager/Admin có thể override nhưng:

- phải có permission,
- phải ghi reason,
- phải audit log.

## Order-Level Production Status

Production nằm theo order item/artwork.

Order-level status được derive.

Ví dụ:

- Item A completed.
- Item B printing.

Order production tổng:
`processing`.

Chỉ `ready_to_ship` khi mọi item cần production đã ready.

## Refund

Refund:

- backend/provider source of truth,
- cần amount,
- reason,
- permission,
- audit log.

Không optimistic update.

## Shipping

Shipping status riêng production status.

Production kết thúc ở `ready_to_ship`.
Fulfillment xử lý:

- shipped,
- delivered,
- returned.

## SLA

Có thể cấu hình:

- review,
- design,
- printing,
- framing,
- QC,
- packing.

Overdue chỉ tạo cảnh báo, không auto-cancel.

## Deletion

Ưu tiên archive/soft delete cho:

- products,
- collections,
- customers,
- artwork.

Không hard-delete entity có transaction history nếu không có yêu cầu pháp lý/kỹ thuật rõ ràng.
