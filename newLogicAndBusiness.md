## Cập nhật mô hình catalog hiện tại

- Medusa `Product` là album; mỗi `ProductImage` là một sản phẩm ảo trên storefront.
- Category và Collection native của Product cha là nguồn phân loại duy nhất.
- Explore chỉ đọc Category/Collection để dựng menu; admin không gán Explore taxonomy riêng nữa.
- Combo 3/5/7 áp dụng theo Category hoặc Collection của Product cha.
- Seed chỉ tạo hạ tầng tối thiểu cho một shop Việt Nam, không tạo catalog mẫu hoặc ảnh cloud.

Được. Với code hiện tại, mô hình này còn khá phù hợp vì dự án đã có sẵn upload nhiều ảnh theo Explore Item và hệ thống combo riêng.

   Thành phần             Vai trò mới
  ━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Medusa Product         Album/nhóm ảnh, ví dụ Dragon Ball
  ─────────────────────  ─────────────────────────────────────────────────
   ProductImage           Một virtual product trên storefront
  ─────────────────────  ─────────────────────────────────────────────────
   Category/Collection    Phân loại Product cha, virtual products kế thừa
  ─────────────────────  ─────────────────────────────────────────────────
   Explore taxonomy       Nhóm hiển thị và phạm vi áp dụng combo
  ─────────────────────  ─────────────────────────────────────────────────
   Internal Variant       Giữ giá cơ bản và dùng để add-to-cart
  ─────────────────────  ─────────────────────────────────────────────────
   Combo Rule             Tính giá cố định khi mua 3/5/7
  ─────────────────────  ─────────────────────────────────────────────────
   Line-item metadata     Lưu chính xác ảnh khách đã chọn

  ### Category và Collection vẫn dùng được

  Ví dụ:

  Category: Anime
  Collection: New Arrivals
  Explore Item: Dragon Ball
  └── Product cha: Dragon Ball
      ├── Goku
      ├── Vegeta
      └── Gohan

  Endpoint mới sẽ:

  1. Lọc Product cha theo category_id, collection_id hoặc taxonomy_term_id.
  2. Flatten product.images.
  3. Trả từng ảnh thành virtual product.
  4. Gắn category/collection của Product cha vào từng kết quả.

  Ví dụ:

  GET /store/image-products?category_id=pcat_anime
  GET /store/image-products?collection_id=pcol_new
  GET /store/image-products?taxonomy_term_id=dragon_ball

  Tuy nhiên, các trang category/collection hiện tại vẫn gọi /store/products, nên nếu chưa sửa chúng thì mỗi album chỉ xuất hiện một lần. Cần chuyển data loader tại apps/storefront/src/lib/data/
  products.ts sang endpoint virtual mới.

  Một giới hạn: tất cả ảnh trong cùng Product sẽ dùng chung category và collection. Nếu Goku thuộc collection “Best Seller” nhưng Vegeta không thuộc, phải thêm metadata/liên kết riêng cho từng ảnh.

  ### Combo 3/5/7 đã có nền tảng

  Dự án hiện đã có ComboRule hỗ trợ:

  3 tranh = giá cố định A
  5 tranh = giá cố định B
  7 tranh = giá cố định C

  Cấu hình ví dụ:

  [
    {
      "minimum_quantity": 3,
      "discount_type": "fixed_total",
      "discount_value": 290000
    },
    {
      "minimum_quantity": 5,
      "discount_type": "fixed_total",
      "discount_value": 450000
    },
    {
      "minimum_quantity": 7,
      "discount_type": "fixed_total",
      "discount_value": 590000
    }
  ]

  Phần này đã được xử lý backend trong apps/backend/src/lib/cart-rules.ts, không hard-code ở storefront. Admin cũng đã có giao diện “Fixed combo total”.

  Các ảnh có thể khác nhau nhưng vẫn được cộng chung:

  Goku × 1
  Vegeta × 1
  Gohan × 1
  ────────────────
  Tổng matching quantity = 3
  → áp dụng giá combo 3

  Mỗi dòng sử dụng cùng internal variant nhưng metadata khác nhau:

  {
    "variant_id": "variant_dragon_ball_default",
    "quantity": 1,
    "metadata": {
      "ttv_source": "explore_image",
      "ttv_explore_image_id": "img_goku",
      "ttv_explore_image_code": "DB-001",
      "ttv_explore_image_url": "https://.../goku.webp"
    }
  }

  Code hiện tại đã lưu các trường ttv_explore_image_* vào cart và order, nên phần này tái sử dụng được.

  ### Điểm cần chốt về giá combo

  - 3 ảnh: 290.000
  - 4 ảnh: khoảng 386.667
  - 5 ảnh: chuyển sang tier 5

  Nếu mong muốn “3 ảnh giá combo, ảnh thứ 4 tính giá thường”, hoặc chỉ cho phép đúng 3/5/7, cần chỉnh thuật toán. Đây là business rule phải chốt trước khi code.

  Tóm lại: category, collection và combo vẫn dùng được. Với dự án này, phần lớn nền tảng đã tồn tại; phần chính còn thiếu là lưu metadata cho từng ProductImage, endpoint flatten ảnh, và chuyển các trang
  product/category/collection sang dữ liệu virtual. Endpoint upload hiện tại ở apps/backend/src/api/admin/tranh-tran-vien/catalog/explore/product-images/route.ts đã là điểm khởi đầu đúng.

─ Worked for 2m 30s ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


› tại vì về business thì khách hàng đặt đơn sp nào thì cty mới in sản phẩm đó để gửi , chứ ko phải có sẵn nên cái stock cũng ko cần thiết ý


• Đúng. Business này là made-to-order / print-on-demand, nên không cần stock cho từng mẫu ảnh.

  Mô hình hợp lý sẽ là:

  Product cha: Dragon Ball
  ├── Internal variant: giá/cấu hình in
  ├── Image: Goku
  ├── Image: Vegeta
  └── Image: Gohan

  Khách đặt Goku
  → tạo order line có metadata Goku
  → công ty mới in
  → tạo production job
  → đóng gói và giao hàng

  Cấu hình variant nội bộ:

  manage_inventory = false
  requires_shipping = true

  Nếu kích thước/chất liệu có giá khác nhau thì variant chỉ đại diện cấu hình sản xuất:

  30×30 / Kim loại
  40×40 / Kim loại
  30×30 / Formex

  Ảnh Goku, Vegeta… vẫn không phải variant.

  Khi đặt hàng phải snapshot đầy đủ thông tin ảnh vào order line:

  {
    "ttv_virtual_product_id": "imgprod_img_goku",
    "ttv_explore_image_id": "img_goku",
    "ttv_explore_image_code": "DB-001",
    "ttv_explore_image_name": "Goku Ultra Instinct",
    "ttv_explore_image_url": "https://.../goku.webp",
    "ttv_parent_product_id": "prod_dragon_ball"
  }

  Việc snapshot rất quan trọng: sau này Admin đổi tên hoặc xóa ảnh thì đơn hàng cũ vẫn biết chính xác phải in mẫu nào.

  Availability lúc này không dựa vào stock mà dựa vào:

  - Product cha đang published.
  - Ảnh có active: true.
  - File ảnh còn tồn tại trên R2.
  - Cấu hình in tương ứng còn được phép bán.

  Combo 3/5/7 cũng phù hợp hơn: hệ thống chỉ cộng số tranh khách chọn rồi áp giá combo, không cần kiểm tra tồn kho. Sau checkout, mỗi order item được đưa sang quy trình production theo tài liệu dự án:

  file_received
  → file_review
  → printing
  → quality_check
  → packing
  → ready_to_ship

  Đây chính là trường hợp mà mô hình “Product cha + virtual products từ ảnh + internal price variant” phát huy hiệu quả nhất.
