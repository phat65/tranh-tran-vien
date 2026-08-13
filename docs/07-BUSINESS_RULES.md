# BUSINESS RULES

Đây là source of truth cho business logic ngoài commerce framework.

## Product

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
