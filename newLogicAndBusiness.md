# Catalog và business model hiện tại

File này là source of truth ngắn gọn cho mô hình bán tranh. Khi tài liệu cũ hoặc
code cũ mâu thuẫn với phần dưới đây, ưu tiên mô hình này.

## 1. Product là album

Medusa `Product` không đại diện cho một mẫu tranh riêng trên storefront. Nó là
album dùng chung cấu hình commerce, ví dụ `Dragon Ball`:

```txt
Product: Dragon Ball
├── internal Variant: cấu hình giá và add-to-cart
├── ProductImage primary: Goku       -> một virtual product
│   ├── ProductImage gallery: góc nghiêng
│   └── ProductImage gallery: cận cảnh
├── ProductImage primary: Vegeta     -> một virtual product
└── ProductImage primary: Gohan      -> một virtual product
```

Hai vai trò ảnh:

- `primary`: một mẫu tranh bán được, được endpoint chiếu thành một virtual
  product trên storefront.
- `gallery`: ảnh mô tả bổ sung cho đúng một ảnh `primary`, không xuất hiện thành
  card sản phẩm riêng.

Metadata tối thiểu:

```json
{
  "role": "primary",
  "title": "Goku Ultra Instinct",
  "handle": "goku-ultra-instinct",
  "code": "DB-001",
  "active": true,
  "alt": "Tranh Goku Ultra Instinct"
}
```

Ảnh gallery dùng `role: "gallery"` và `primary_image_id` để trỏ tới ảnh primary.
Nhờ vậy một mẫu tranh vẫn có thể có nhiều ảnh mà không cần tạo Product hay
Variant phụ.

## 2. Medusa native là nguồn dữ liệu chính

- Product cha giữ Category và Collection native của Medusa.
- Virtual product kế thừa Category, Collection, giá, option và variant nội bộ
  từ Product cha.
- Explore chỉ là lớp hiển thị mỏng đọc Category/Collection native.
- Không còn hệ taxonomy hay navigation catalog riêng để gán Product lần hai.
- Product vẫn cần ít nhất một variant nội bộ vì Medusa dùng variant cho giá,
  payment, tax, cart và order. Ảnh không phải variant.

Endpoint storefront:

```http
GET /store/image-products
GET /store/image-products?parent_handle=dragon-ball
GET /store/image-products?category_id=pcat_anime
GET /store/image-products?collection_id=pcol_new-arrivals
```

Endpoint chỉ trả ảnh `primary` đang active. Trường `images` của mỗi kết quả gồm
ảnh primary và các ảnh gallery trực thuộc.

## 3. Made-to-order và đơn hàng

Tranh chỉ được sản xuất sau khi khách đặt, vì vậy variant nội bộ dùng:

- `manage_inventory = false`;
- `allow_backorder = true`.

Khi add-to-cart, client gửi variant nội bộ cùng image-product ID. Backend phải
xác thực ảnh primary và snapshot vào line item:

- primary image ID;
- tên, code, handle;
- URL ảnh hiển thị;
- URL/file dùng sản xuất;
- các URL gallery nếu cần đối chiếu;
- parent Product ID.

Order cũ không phụ thuộc metadata hoặc URL hiện tại sau khi ảnh bị sửa/xóa.

## 4. Bảng giá theo số lượng

Giá gốc và giá theo số lượng được cấu hình bằng Product Variant và Price List
native của Medusa. Storefront không hard-code hoặc tự tính lại giá thanh toán.

Ví dụ variant có giá niêm yết 250.000đ, Price List có thể đặt đơn giá 225.000đ
cho số lượng 2 và 212.500đ từ số lượng 3 trở lên. Endpoint chỉ đọc các mức giá
Medusa đã tính để hiển thị trên detail của từng virtual product; cart và checkout
vẫn để pricing engine của Medusa tính tổng cuối cùng.

Quantity pricing native áp dụng theo số lượng của từng line item/variant. Các
virtual product khác ảnh được giữ ở các line riêng để snapshot đúng mẫu khách
chọn, vì vậy không tự cộng số lượng giữa nhiều line ảnh khác nhau. Nếu business
sau này cần cộng chéo nhiều mẫu, phải dùng Promotion native hoặc một ticket riêng.

Không còn custom Combo Rule, Gift Rule hoặc Shipping Rule. Khuyến mãi và phương
thức vận chuyển dùng tính năng native của Medusa.

## 5. SePay

SePay hiển thị VietQR trực tiếp trong bước thanh toán. Không chuyển khách sang
trang checkout hosted thứ ba.

- QR chứa đúng tài khoản, số tiền và nội dung chuyển khoản duy nhất.
- Webhook ngân hàng SePay xác nhận giao dịch bằng chữ ký HMAC.
- Backend chỉ xác nhận khi giao dịch tiền vào, đúng tài khoản, đúng số tiền và
  đúng mã invoice.
- Khách bấm kiểm tra thanh toán; Medusa chỉ hoàn tất cart sau khi payment session
  đã được webhook đánh dấu paid.

## 6. Seed và storage

- Seed chỉ tạo một shop Việt Nam, một sales channel và một publishable API key.
- Seed không tạo Product mẫu và không tải ảnh cloud.
- Development dùng Medusa local file provider khi không cấu hình S3/R2.
- Production có thể bật R2/S3 bằng env mà không đổi logic upload/catalog.

## 7. Admin tối thiểu

Trong Product Edit, nhân viên có thể upload nhiều ảnh, đổi role primary/gallery,
gắn gallery vào primary, sửa title/handle/code/alt/active, chọn nhiều ảnh và xóa
hàng loạt. Category, Collection, price list, order và payment tiếp tục dùng giao
diện/quy tắc native của Medusa ở mức tối đa có thể.
