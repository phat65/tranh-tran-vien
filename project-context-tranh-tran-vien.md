# Project Context — Website Tranh Tràn Viền

## 1. Mục đích tài liệu

Tài liệu này là nguồn context nền tảng cho toàn bộ quá trình phân tích, thiết kế, phát triển và bảo trì website **Tranh Tràn Viền**.

Tài liệu được dùng để:

- Giúp developer hiểu đúng mục tiêu kinh doanh.
- Làm context cho AI coding agent.
- Hạn chế hard-code theo một dòng sản phẩm cụ thể.
- Thống nhất kiến trúc, công nghệ và quy ước triển khai.
- Làm căn cứ khi thiết kế database, API, admin và storefront.
- Giúp dự án có thể mở rộng thêm thương hiệu phụ và dòng sản phẩm trong tương lai.

---

# 2. Tổng quan thương hiệu

## 2.1. Thương hiệu chính

**Tranh Tràn Viền** là thương hiệu chính và cũng là tên chính của website.

Website không được thiết kế chỉ xoay quanh Pokémon. Kiến trúc phải hỗ trợ nhiều dòng sản phẩm, thương hiệu phụ, bộ sưu tập và chủ đề khác nhau.

## 2.2. Các dòng sản phẩm hiện tại

### Tranh lục giác hợp kim

Đây là dòng sản phẩm chính của Tranh Tràn Viền.

### POKE Framium

POKE Framium là thương hiệu phụ thuộc Tranh Tràn Viền, chuyên về khung trưng bày thẻ Pokémon.

Hiện có hai dòng:

- POKE Framium — Khung Pokémon lục giác.
- POKE Framium — Khung Pokémon acrylic.

## 2.3. Yêu cầu mở rộng

Hệ thống phải cho phép quản trị viên bổ sung:

- Thương hiệu phụ mới.
- Dòng sản phẩm mới.
- Danh mục mới.
- Chủ đề mới.
- Bộ sưu tập mới.
- Series mới.
- Nhân vật mới.
- Sản phẩm lẻ.
- Combo sản phẩm.
- Chính sách giá và khuyến mãi mới.

Không được yêu cầu sửa lại toàn bộ source code khi thêm các nhóm dữ liệu trên.

---

# 3. Định hướng giao diện

## 3.1. Phong cách

Website tham khảo cách trình bày của các website bán game, phụ kiện gaming, TCG và đồ sưu tầm như:

- TCG Plate.
- nShop.
- TTGShop.

Phong cách mong muốn:

- Hiện đại.
- Dễ nhìn.
- Có tinh thần anime, game và collector.
- Tập trung vào hình ảnh sản phẩm.
- Không dùng quá nhiều banner.
- Không lạm dụng animation.
- Không dùng hiệu ứng nặng gây chậm hoặc rối mắt.
- Tối ưu tốt trên điện thoại và máy tính.

## 3.2. Mục tiêu trải nghiệm người dùng

Khách hàng cần có thể dễ dàng:

- Tìm sản phẩm.
- Xem giá.
- So sánh combo.
- Xem hình ảnh và video.
- Chọn mẫu.
- Chọn số lượng.
- Tải ảnh thiết kế.
- Thêm vào giỏ hàng.
- Đặt mua.
- Liên hệ shop qua Zalo.
- Theo dõi đơn hàng.

---

# 4. Requirements sản phẩm

## 4.1. Tranh lục giác hợp kim

### Kích thước

- Cao: 24 cm.
- Ngang rộng nhất: 20,8 cm.
- Cạnh dài: 12 cm.
- Hình lục giác có đỉnh nhọn hướng lên trên.

### Giá bán

| Gói | Giá |
|---|---:|
| 1 tranh | 99.000đ |
| Combo 3 tranh | 290.000đ |
| Combo 5 tranh | 460.000đ |
| Combo 9 tranh | 810.000đ |
| Combo 10 tranh | 890.000đ |
| Combo 15 tranh | 1.230.000đ |
| Combo 20 tranh | 1.640.000đ |

### Quà tặng

Mỗi đơn được tặng bộ nam châm treo tranh cao cấp.

### Chức năng cần có

Khách hàng có thể:

- Chọn tranh lẻ hoặc combo.
- Chọn mẫu có sẵn.
- Chọn số lượng.
- Đặt thiết kế theo yêu cầu.
- Tải ảnh lên website.
- Nhập yêu cầu thiết kế.
- Chọn bố cục treo tranh.
- Xem preview cơ bản.
- Thêm sản phẩm vào giỏ.
- Đặt mua trực tiếp.

### Yêu cầu định hướng bán hàng

- Combo 9 và combo 15 cần được làm nổi bật.
- Việc làm nổi bật phải dựa trên dữ liệu quản trị, không hard-code theo số lượng trong frontend.

Ví dụ metadata:

```json
{
  "piece_count": 9,
  "is_recommended": true,
  "badge": "Lựa chọn phổ biến"
}
```

---

## 4.2. POKE Framium — Khung Pokémon lục giác

### Kích thước

- Ngang: 18 cm.
- Cao: 15,6 cm.
- Cạnh dài: 9 cm.
- Hình lục giác có cạnh phẳng nằm trên và dưới.

### Giá bán

| Gói | Giá | Quà tặng | Vận chuyển |
|---|---:|---|---|
| 1 khung | 199.000đ | 1 hộp chống UV | Phí ship 30.000đ |
| 2 khung | 389.000đ | 2 hộp chống UV | Freeship |
| 3 khung | 550.000đ | 3 hộp chống UV cao cấp | Freeship |

### Nội dung bắt buộc

- Sản phẩm không bao gồm thẻ Pokémon.
- Khách đặt thiết kế riêng thông qua Zalo.
- Khi bấm Zalo, hệ thống tự điền sẵn tên sản phẩm, mã sản phẩm và link trang đang xem.

---

## 4.3. POKE Framium — Khung Pokémon acrylic

### Kích thước

- 20 × 20 cm.

### Giá bán

- 240.000đ/tranh.
- Mua từ 2 tranh giảm 10%.
- Tặng hộp đựng thẻ chống UV.
- Freeship toàn quốc.

### Nội dung bắt buộc

- Sản phẩm không bao gồm thẻ Pokémon.
- Khách đặt thiết kế riêng qua Zalo.

---

# 5. Cấu trúc trang website

Website cần có các trang chính:

- Trang chủ.
- Trang sản phẩm.
- Trang danh mục.
- Trang chi tiết sản phẩm.
- Trang thiết kế tranh theo yêu cầu.
- Trang thương hiệu POKE Framium.
- Trang feedback khách hàng.
- Trang blog.
- Trang giới thiệu.
- Trang liên hệ.
- Trang chính sách.
- Giỏ hàng.
- Thanh toán.
- Đăng nhập.
- Đăng ký.
- Trang tài khoản khách hàng.
- Lịch sử đơn hàng.
- Sản phẩm yêu thích.
- Thiết kế đã gửi.

---

# 6. Danh mục và taxonomy

## 6.1. Dữ liệu quản trị viên có thể tạo

- Danh mục chính.
- Danh mục phụ.
- Thương hiệu phụ.
- Bộ sưu tập.
- Chủ đề.
- Nhân vật.
- Series.
- Sản phẩm lẻ.
- Sản phẩm combo.

## 6.2. Ví dụ

```text
Tranh lục giác
├── Dragon Ball
├── Anime
├── Game
└── Thiết kế theo yêu cầu

POKE Framium
├── Khung lục giác
└── Khung acrylic
```

## 6.3. Nguyên tắc thiết kế

Không gom toàn bộ chủ đề, nhân vật, series và collection vào một cột text hoặc một mảng JSON duy nhất trong product.

Nên tách taxonomy thành các entity có quan hệ nhiều-nhiều với sản phẩm.

---

# 7. Mega Menu

Website cần Mega Menu tương tự các website game và đồ sưu tầm.

Mega Menu có thể gồm:

- Tranh lục giác.
- POKE Framium.
- Chủ đề tranh.
- Bộ sưu tập.
- Thiết kế theo yêu cầu.
- Feedback.
- Blog.
- Khuyến mãi.

Mega Menu cần hỗ trợ:

- Menu nhiều cấp.
- Sắp xếp thứ tự.
- Bật/tắt hiển thị.
- Liên kết đến sản phẩm.
- Liên kết đến danh mục.
- Liên kết đến thương hiệu.
- Liên kết đến collection.
- Liên kết đến blog hoặc trang tĩnh.
- Hiển thị hình ảnh bộ sưu tập nổi bật.

Menu phải được quản lý từ admin, không viết cố định trong code.

---

# 8. Trang thiết kế theo yêu cầu

## 8.1. Tranh lục giác

Khách hàng có thể:

- Chọn số lượng tranh.
- Chọn combo.
- Tải ảnh lên.
- Nhập yêu cầu.
- Chọn bố cục treo.
- Sắp xếp ảnh vào từng vị trí.
- Crop và zoom ảnh.
- Xem preview.
- Gửi yêu cầu cho shop.
- Gắn thiết kế vào giỏ hàng.
- Đặt hàng trực tiếp.

## 8.2. Preview

MVP nên có preview 2D trước.

Có thể nâng cấp preview 3D sau khi luồng thương mại điện tử và preview 2D hoạt động ổn định.

## 8.3. Khung Pokémon

Khách không thiết kế trực tiếp trên website.

Trang chỉ cần:

- Hiển thị mẫu.
- Giới thiệu quy trình.
- Nút liên hệ Zalo.
- Tự điền nội dung sản phẩm khách đang quan tâm.

---

# 9. Trang chi tiết sản phẩm

Mỗi sản phẩm cần hiển thị:

- Tên sản phẩm.
- Hình ảnh.
- Video nếu có.
- Giá bán.
- Giá combo.
- Kích thước.
- Chất liệu.
- Quà tặng.
- Phí vận chuyển.
- Mô tả.
- Hướng dẫn treo.
- Cảnh báo hoặc lưu ý.
- Nút thêm vào giỏ.
- Nút mua ngay.
- Nút liên hệ Zalo.
- Sản phẩm liên quan.
- Feedback liên quan.

---

# 10. Khuyến mãi

Quản trị viên có thể tự tạo và thay đổi:

- Giá giảm.
- Mã giảm giá.
- Khuyến mãi theo sản phẩm.
- Khuyến mãi theo danh mục.
- Khuyến mãi theo thương hiệu.
- Giảm giá theo số lượng.
- Giá combo.
- Freeship.
- Quà tặng.
- Thời gian bắt đầu.
- Thời gian kết thúc.
- Điều kiện áp dụng.
- Mức độ ưu tiên.
- Cho phép hoặc không cho phép cộng dồn.

Các chương trình khuyến mãi không được viết cố định trong source code.

---

# 11. Thành viên và khách vãng lai

## 11.1. Thành viên

Khách hàng có thể:

- Đăng ký.
- Đăng nhập.
- Xem lịch sử đơn hàng.
- Theo dõi trạng thái đơn hàng.
- Lưu địa chỉ.
- Lưu sản phẩm yêu thích.
- Xem các thiết kế đã gửi.
- Đặt lại sản phẩm cũ.

## 11.2. Guest checkout

Khách vẫn được mua hàng mà không cần tạo tài khoản.

Giỏ hàng khách vãng lai cần được lưu bằng cart token hoặc cookie an toàn.

Khi khách đăng nhập, hệ thống cần xử lý việc giữ hoặc merge giỏ hàng hiện tại.

---

# 12. Feedback và blog

## 12.1. Feedback

Feedback có thể gồm:

- Hình ảnh.
- Video.
- Nội dung đánh giá.
- Số sao.
- Sản phẩm khách đã mua.
- Thông tin khách hiển thị.
- Liên kết đơn hàng nếu có.

Feedback cần được admin duyệt trước khi hiển thị.

## 12.2. Blog

Các nhóm nội dung dự kiến:

- Cách phối tranh.
- Hướng dẫn treo tranh.
- Trang trí phòng gaming.
- Giới thiệu bộ sưu tập.
- Kiến thức về khung Pokémon.
- Cách bảo vệ thẻ Pokémon.
- Tin tức.
- Chương trình khuyến mãi.

---

# 13. Trang quản trị

Quản trị viên có thể:

- Đăng sản phẩm.
- Chỉnh sửa sản phẩm.
- Tạo danh mục.
- Tạo danh mục phụ.
- Tạo thương hiệu phụ.
- Thay đổi giá.
- Thay đổi combo.
- Tạo khuyến mãi.
- Quản lý đơn hàng.
- Quản lý khách hàng.
- Quản lý file khách tải lên.
- Quản lý thiết kế.
- Đăng bài blog.
- Đăng và duyệt feedback.
- Chỉnh banner.
- Chỉnh nội dung trang chủ.
- Quản lý Mega Menu.
- Thay đổi thông tin Zalo.
- Thay đổi link Facebook và TikTok.
- Xuất danh sách đơn hàng.

---

# 14. Yêu cầu kỹ thuật

- Tải nhanh.
- Mobile-first.
- Responsive.
- SSL.
- Sao lưu dữ liệu.
- Tối ưu ảnh.
- Tìm kiếm sản phẩm.
- Bộ lọc theo danh mục, chủ đề và giá.
- Kết nối Zalo.
- Kết nối Facebook.
- Kết nối TikTok.
- Google Analytics.
- Meta Pixel.
- TikTok Pixel.
- SEO cơ bản.
- Có sitemap.
- Có structured data.
- Có monitoring.
- Có error tracking.
- Dễ nâng cấp thêm dòng sản phẩm và thương hiệu phụ.

---

# 15. Kiến trúc được đề xuất

## 15.1. Kiểu kiến trúc

Sử dụng **modular monolith**.

Không sử dụng microservices trong giai đoạn đầu.

Lý do:

- Dễ phát triển.
- Dễ debug.
- Transaction đơn giản.
- Ít chi phí vận hành.
- Phù hợp với quy mô ban đầu.
- Vẫn có thể tách worker hoặc service sau này.

## 15.2. Kiến trúc tổng thể

```text
Next.js Storefront
        │
        ▼
Medusa Commerce Backend
        │
        ├── PostgreSQL
        ├── Redis
        ├── R2/S3 Storage
        └── External integrations
```

---

# 16. Công nghệ đề xuất và lý do sử dụng

## 16.1. TypeScript

### Vai trò

Ngôn ngữ chính cho frontend và backend.

### Tại sao dùng

- Giữ nguyên hệ sinh thái JavaScript.
- Kiểm soát type cho product, order, promotion và design request.
- Giảm lỗi khi refactor.
- Dễ chia sẻ type giữa frontend và backend.
- Phù hợp dự án có nhiều rule và trạng thái.

Không nên dùng JavaScript thuần cho toàn bộ dự án vì object nghiệp vụ dễ mất kiểm soát khi hệ thống lớn dần.

---

## 16.2. Next.js App Router

### Vai trò

Xây storefront cho khách hàng.

### Tại sao dùng

- Hỗ trợ Server Components.
- Tốt cho SEO.
- Hỗ trợ dynamic metadata.
- Hỗ trợ route theo thư mục.
- Hỗ trợ streaming và server rendering.
- Phù hợp website bán hàng có nhiều trang sản phẩm và category.
- Dễ triển khai responsive storefront.

---

## 16.3. React

### Vai trò

Xây UI tương tác.

### Tại sao dùng

- Hệ sinh thái lớn.
- Phù hợp với form, cart và design studio.
- Tích hợp tốt với Next.js.
- Có nhiều thư viện xử lý canvas, 3D và state.

---

## 16.4. Medusa v2

### Vai trò

Commerce backend.

### Quản lý

- Product.
- Product variant.
- Pricing.
- Cart.
- Customer.
- Order.
- Promotion.
- Payment.
- Fulfillment.
- Inventory.
- Admin.

### Tại sao dùng

Nếu tự viết toàn bộ bằng Express hoặc NestJS, dự án phải tự xử lý nhiều nghiệp vụ phức tạp như:

- Cart lifecycle.
- Guest checkout.
- Price calculation.
- Promotion.
- Discount.
- Payment state.
- Order state.
- Inventory.
- Refund.
- Fulfillment.
- Admin dashboard.

Medusa cung cấp commerce core sẵn và vẫn cho phép:

- Viết custom module.
- Viết custom workflow.
- Viết API riêng.
- Mở rộng admin.
- Liên kết custom data với product, cart và order.

---

## 16.5. PostgreSQL

### Vai trò

Database chính.

### Tại sao dùng

- Phù hợp dữ liệu quan hệ.
- Hỗ trợ transaction tốt.
- Phù hợp order, payment và promotion.
- Hỗ trợ index và full-text search cơ bản.
- Dễ mở rộng.
- Có hệ sinh thái hosting phong phú.
- Phù hợp với Medusa.

---

## 16.6. Redis

### Vai trò

- Cache.
- Event bus.
- Job queue.
- Distributed lock.
- Workflow support.
- Session hoặc temporary data khi cần.

### Tại sao dùng

- Giảm tải database.
- Hỗ trợ xử lý job.
- Hữu ích khi generate preview, đồng bộ search hoặc cleanup upload.
- Phù hợp kiến trúc production của commerce backend.

---

## 16.7. Cloudflare R2 hoặc AWS S3

### Vai trò

Lưu:

- Ảnh sản phẩm.
- Video nếu cần.
- File khách tải lên.
- Ảnh preview.
- File thiết kế.
- Feedback media.

### Tại sao dùng

- Không lưu file trực tiếp trong database.
- Không phụ thuộc ổ đĩa của server.
- Hỗ trợ presigned URL.
- Browser có thể upload trực tiếp.
- Dễ mở rộng dung lượng.
- Phù hợp file ảnh dung lượng lớn.

Cloudflare R2 phù hợp nếu muốn giảm chi phí egress và dùng hệ sinh thái Cloudflare.

---

## 16.8. Tailwind CSS

### Vai trò

Styling storefront và custom admin UI.

### Tại sao dùng

- Phát triển giao diện nhanh.
- Dễ kiểm soát responsive.
- Dễ duy trì design system.
- Phù hợp UI hiện đại.
- Không cần tạo quá nhiều file CSS rời rạc.

---

## 16.9. shadcn/ui

### Vai trò

Bộ component cơ sở.

### Tại sao dùng

- Có thể chỉnh sửa source component.
- Không bị khóa vào một package UI lớn.
- Phù hợp Tailwind.
- Hỗ trợ accessibility.
- Tốt cho form, dialog, sheet, dropdown và admin UI.

---

## 16.10. React Hook Form

### Vai trò

Quản lý form.

### Tại sao dùng

- Hiệu năng tốt.
- Phù hợp form checkout và custom design.
- Tích hợp tốt với Zod.
- Giảm re-render không cần thiết.

---

## 16.11. Zod

### Vai trò

Validation.

### Tại sao dùng

- Validation runtime.
- Dùng chung schema giữa frontend và backend.
- Validation environment variables.
- Validation API payload.
- Validation form upload và checkout.

---

## 16.12. Zustand

### Vai trò

Quản lý state phía client khi cần.

### Tại sao dùng

Phù hợp cho:

- Design studio.
- Trạng thái canvas.
- Modal hoặc drawer.
- State cục bộ có nhiều component.

Không nên dùng Zustand để thay thế server state hoặc database state.

---

## 16.13. Konva.js hoặc Fabric.js

### Vai trò

Xây preview 2D.

### Tại sao dùng

- Hỗ trợ canvas.
- Kéo thả.
- Crop.
- Zoom.
- Transform.
- Polygon.
- Export ảnh preview.
- Phù hợp trải nghiệm thiết kế tranh.

Ưu tiên Konva.js nếu muốn tích hợp React thuận tiện với `react-konva`.

---

## 16.14. Three.js và React Three Fiber

### Vai trò

Preview 3D giai đoạn sau.

### Tại sao dùng

- Hiển thị tranh trên tường.
- Render texture từ ảnh khách.
- Mô phỏng kích thước và khoảng cách.
- Tích hợp tốt với React.

Không đưa 3D vào MVP vì:

- Tăng độ phức tạp.
- Tăng tải thiết bị.
- Không phải luồng cốt lõi để bán hàng ban đầu.

---

## 16.15. pnpm Workspace

### Vai trò

Quản lý monorepo.

### Tại sao dùng

- Nhanh.
- Tiết kiệm dung lượng.
- Quản lý package nội bộ tốt.
- Hỗ trợ workspace rõ ràng.

---

## 16.16. Turborepo

### Vai trò

Điều phối build, lint, test và dev trong monorepo.

### Tại sao dùng

- Cache task.
- Chạy song song.
- Quản lý dependency giữa các app và package.
- Phù hợp Next.js và TypeScript monorepo.

---

## 16.17. Vitest

### Vai trò

Unit test và integration test cấp module.

### Tại sao dùng

- Nhanh.
- Tương thích tốt với TypeScript.
- API quen thuộc.
- Phù hợp hệ sinh thái Vite và Node hiện đại.

---

## 16.18. Playwright

### Vai trò

End-to-end testing.

### Tại sao dùng

- Kiểm tra luồng người dùng thật.
- Hỗ trợ nhiều browser.
- Phù hợp test checkout, cart và upload.
- Có khả năng chụp screenshot và trace lỗi.

---

## 16.19. Docker

### Vai trò

Chuẩn hóa môi trường local và production.

### Tại sao dùng

- Developer chạy cùng một môi trường.
- Dễ cấu hình PostgreSQL và Redis.
- Dễ CI/CD.
- Hạn chế lỗi khác môi trường.

---

## 16.20. GitHub Actions

### Vai trò

CI/CD.

### Pipeline cơ bản

- Install dependencies.
- Lint.
- Typecheck.
- Unit test.
- Integration test.
- Build.
- Migration check.
- Deploy staging.
- Deploy production sau khi được duyệt.

### Tại sao dùng

- Tích hợp trực tiếp GitHub.
- Dễ cấu hình.
- Hỗ trợ workflow theo pull request.

---

## 16.21. Sentry

### Vai trò

Error tracking và performance monitoring.

### Tại sao dùng

- Theo dõi lỗi frontend.
- Theo dõi lỗi backend.
- Có stack trace.
- Có release tracking.
- Giúp phát hiện lỗi checkout và payment.

---

# 17. Cấu trúc monorepo đề xuất

```text
tranh-tran-vien/
├── apps/
│   ├── storefront/
│   ├── commerce/
│   └── media-worker/
├── packages/
│   ├── ui/
│   ├── contracts/
│   ├── validation/
│   ├── sdk/
│   ├── analytics/
│   ├── eslint-config/
│   ├── typescript-config/
│   └── test-utils/
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── monitoring/
│   └── backup/
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── database/
│   ├── api/
│   └── business-rules/
├── scripts/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
└── package.json
```

---

# 18. Custom modules dự kiến

Commerce backend cần có các module riêng:

- Brand Module.
- Taxonomy Module.
- Custom Design Module.
- Gift Rule Module.
- Shipping Rule Module.
- Feedback Module.
- Content Module.
- Navigation Module.
- Site Settings Module.
- Audit Log Module nếu cần.

---

# 19. Database domain đề xuất

## 19.1. Commerce core

Sử dụng entity có sẵn của Medusa cho:

- Product.
- Product variant.
- Product option.
- Price.
- Cart.
- Line item.
- Customer.
- Address.
- Order.
- Payment.
- Fulfillment.
- Inventory.
- Promotion.

Không tự tạo lại những bảng này nếu commerce framework đã cung cấp.

---

## 19.2. Brand

```text
brands
- id
- name
- slug
- parent_id
- logo_url
- description
- status
- sort_order
- seo_title
- seo_description
- created_at
- updated_at

product_brands
- product_id
- brand_id
- is_primary
```

---

## 19.3. Taxonomy

```text
taxonomies
- id
- code
- name

taxonomy_terms
- id
- taxonomy_id
- parent_id
- name
- slug
- image_url
- description
- sort_order
- status

product_taxonomy_terms
- product_id
- term_id
```

---

## 19.4. Custom design

```text
design_requests
- id
- customer_id nullable
- guest_token nullable
- product_id
- variant_id
- piece_count
- layout_template_id nullable
- status
- customer_note
- internal_note
- preview_url
- snapshot_json
- cart_id nullable
- order_id nullable
- order_line_item_id nullable
- created_at
- updated_at

design_assets
- id
- design_request_id
- object_key
- original_filename
- mime_type
- size_bytes
- width
- height
- checksum
- upload_status
- created_at

design_canvas_items
- id
- design_request_id
- design_asset_id
- slot_index
- crop_data_json
- transform_data_json
- created_at
- updated_at

design_revisions
- id
- design_request_id
- version
- preview_url
- status
- note
- created_by
- created_at

layout_templates
- id
- name
- piece_count
- thumbnail_url
- canvas_width
- canvas_height
- layout_json
- status
```

---

## 19.5. Trạng thái thiết kế

```text
DRAFT
UPLOADING
SUBMITTED
ATTACHED_TO_CART
ORDERED
DESIGNING
AWAITING_CUSTOMER_APPROVAL
REVISION_REQUESTED
APPROVED
IN_PRODUCTION
COMPLETED
CANCELLED
```

---

## 19.6. Gift rule

```text
gift_rules
- id
- name
- scope_type
- product_id nullable
- category_id nullable
- brand_id nullable
- minimum_quantity
- gift_variant_id
- gift_quantity
- starts_at
- ends_at
- priority
- is_stackable
- status
```

---

## 19.7. Shipping rule

```text
shipping_rules
- id
- name
- scope_type
- product_id nullable
- category_id nullable
- brand_id nullable
- minimum_quantity
- maximum_quantity nullable
- shipping_fee
- is_free_shipping
- starts_at
- ends_at
- priority
- status
```

---

## 19.8. Content

```text
posts
- id
- title
- slug
- excerpt
- content_json
- cover_image_url
- author_id
- category_id
- status
- published_at
- seo_title
- seo_description

feedbacks
- id
- customer_name
- order_id nullable
- product_id nullable
- rating
- content
- status
- published_at

feedback_media
- id
- feedback_id
- type
- object_key
- sort_order

pages
- id
- title
- slug
- content_json
- page_type
- status
- seo_title
- seo_description
```

---

## 19.9. Navigation

```text
navigation_menus
- id
- code
- name

navigation_items
- id
- menu_id
- parent_id
- label
- link_type
- entity_id nullable
- url nullable
- image_url nullable
- sort_order
- visibility
```

---

## 19.10. Site settings

```text
site_settings
- id
- key
- value_json
- is_public
- updated_at
```

Ví dụ:

- zalo_phone.
- zalo_oa_url.
- facebook_url.
- tiktok_url.
- hotline.
- support_email.
- analytics_id.
- meta_pixel_id.
- tiktok_pixel_id.

Secret key không được lưu dưới dạng public site setting.

---

# 20. Nguyên tắc modeling sản phẩm

## 20.1. Combo

Combo có thể được mô hình hóa bằng product variant nếu combo là một lựa chọn mua của cùng một sản phẩm.

Ví dụ:

```text
Product: Tranh lục giác hợp kim

Variants:
- 1 tranh
- Combo 3
- Combo 5
- Combo 9
- Combo 10
- Combo 15
- Combo 20
```

## 20.2. Metadata

Dùng metadata cho các thuộc tính hiển thị phụ như:

- piece_count.
- badge.
- is_recommended.
- display_order.

Không dùng metadata cho dữ liệu cần query phức tạp hoặc có quan hệ nghiệp vụ lớn.

---

# 21. Nguyên tắc upload file

Luồng upload đề xuất:

```text
Browser
  → Backend xin presigned URL
  → Browser upload trực tiếp R2/S3
  → Backend xác nhận upload
  → Lưu metadata vào database
```

Yêu cầu bảo mật:

- Giới hạn MIME type.
- Giới hạn dung lượng.
- Kiểm tra file thực tế.
- Dùng UUID cho object key.
- Không dùng tên file gốc làm đường dẫn.
- File khách tải lên mặc định private.
- Chỉ người có quyền mới được xem.
- Có cleanup file nháp hết hạn.
- Không gửi file khách sang analytics.

---

# 22. Preview 2D và 3D

## MVP

Preview 2D với Konva.js hoặc Fabric.js.

Dữ liệu cần lưu:

- Layout.
- Asset ID.
- Slot index.
- Position.
- Scale.
- Rotation.
- Crop.
- Canvas size.
- Preview URL.
- Snapshot JSON.

## Phase 2

Preview 3D với Three.js và React Three Fiber.

3D phải lazy-load và có fallback 2D cho máy yếu.

---

# 23. Search

## MVP

Dùng PostgreSQL cho:

- Tìm theo tên.
- Lọc category.
- Lọc brand.
- Lọc taxonomy.
- Lọc giá.
- Lọc collection.
- Lọc trạng thái.

## Khi dữ liệu lớn

Có thể bổ sung:

- Meilisearch.
- Typesense.

Search engine không bắt buộc ở giai đoạn đầu.

---

# 24. Authentication và authorization

## Customer

- Guest checkout.
- Member checkout.
- Order history.
- Address.
- Wishlist.
- Saved designs.

## Admin roles

- Owner.
- Catalog Manager.
- Order Manager.
- Content Editor.
- Designer.
- Customer Support.
- Marketing.

Các hành động quan trọng nên có audit log.

---

# 25. SEO và tracking

## SEO

- Dynamic metadata.
- Canonical.
- Sitemap.
- Robots.
- Open Graph.
- Product structured data.
- Offer structured data.
- Breadcrumb structured data.
- Article structured data.
- SEO fields cho product, category, brand, page và post.

## Tracking

Tạo abstraction:

```ts
analytics.track("view_product", payload)
analytics.track("add_to_cart", payload)
analytics.track("begin_checkout", payload)
analytics.track("purchase", payload)
analytics.track("submit_custom_design", payload)
analytics.track("click_zalo", payload)
```

Sau đó adapter gửi sang:

- Google Analytics.
- Meta Pixel.
- TikTok Pixel.

Không gọi trực tiếp các pixel trong mọi component.

---

# 26. Testing

## Unit test

- Tính combo.
- Tính promotion.
- Gift rule.
- Shipping rule.
- Zalo message.
- Upload validation.
- Design status transition.

## Integration test

- Cart.
- Promotion.
- Checkout.
- Customer.
- Attach design to cart.
- Create order.
- Payment callback.

## End-to-end test

- Mua sản phẩm có sẵn.
- Mua combo 9.
- Upload ảnh và đặt tranh custom.
- Mua POKE Framium 1 khung.
- Mua POKE Framium 2 khung và freeship.
- Đăng ký và xem đơn hàng.
- Admin tạo promotion.
- Admin duyệt feedback.
- Admin đổi Mega Menu.

---

# 27. Deployment

## Local

Docker Compose:

- PostgreSQL.
- Redis.
- Commerce backend.
- Storefront.
- Local object storage nếu cần.

## Staging

- Database riêng.
- Storage riêng.
- Biến môi trường riêng.
- Không dùng dữ liệu production thật nếu không cần.

## Production

- Cloudflare DNS/CDN/WAF.
- Next.js hosting.
- Medusa backend bằng Docker.
- Managed PostgreSQL.
- Managed Redis.
- Cloudflare R2.
- HTTPS.
- Backup tự động.
- Monitoring.
- Error tracking.
- Rate limiting.
- Security headers.

---

# 28. Roadmap triển khai

## Sprint 0 — Requirement và thiết kế

- Sitemap.
- User flow.
- Product model.
- Promotion matrix.
- Shipping matrix.
- Role matrix.
- Wireframe.
- ERD.
- API contract.
- Acceptance criteria.

## Sprint 1 — Foundation

- Monorepo.
- Next.js.
- Medusa.
- PostgreSQL.
- Redis.
- Docker.
- CI.
- Environment validation.
- Logging.

## Sprint 2 — Catalog và admin

- Brand.
- Taxonomy.
- Category.
- Product.
- Variant.
- Combo.
- Media.
- Mega Menu.
- Site settings.

## Sprint 3 — Commerce

- Product listing.
- Filter.
- Product detail.
- Cart.
- Guest checkout.
- Member checkout.
- Promotion.
- Gift rule.
- Shipping rule.
- Order.
- Zalo.

## Sprint 4 — Custom design

- Design request.
- Presigned upload.
- Asset management.
- Layout template.
- Canvas 2D.
- Preview.
- Attach design to cart.
- Designer admin workflow.

## Sprint 5 — Content và account

- Blog.
- Feedback.
- Pages.
- Account.
- Address.
- Wishlist.
- Order history.
- Saved designs.

## Sprint 6 — Production readiness

- SEO.
- Analytics.
- Pixels.
- Backup.
- Monitoring.
- Performance.
- Security.
- UAT.
- Production deployment.

---

# 29. Quy tắc bắt buộc khi code

1. Không hard-code giá vào frontend.
2. Không hard-code combo nổi bật.
3. Không hard-code khuyến mãi.
4. Không hard-code freeship.
5. Không hard-code quà tặng.
6. Không hard-code Zalo.
7. Không hard-code Mega Menu.
8. Không thiết kế schema chỉ cho Pokémon.
9. Không lưu file upload trực tiếp trong database.
10. Không tin dữ liệu giá do frontend gửi lên.
11. Backend phải tính lại giá, promotion và shipping.
12. Dùng TypeScript strict mode.
13. Tất cả payload phải được validation.
14. Tách domain module rõ ràng.
15. Không tạo microservices quá sớm.
16. Dùng migration cho mọi thay đổi database.
17. Có seed data cho môi trường development.
18. Có test cho business rule quan trọng.
19. Không gửi dữ liệu thiết kế khách hàng sang analytics.
20. Thiết kế phải có snapshot khi tạo đơn hàng.

---

# 30. Kết luận kiến trúc

Nền móng được lựa chọn:

```text
TypeScript
Next.js App Router
React
Medusa v2
PostgreSQL
Redis
Cloudflare R2 hoặc AWS S3
Tailwind CSS
shadcn/ui
React Hook Form
Zod
Zustand
Konva.js
Three.js ở giai đoạn sau
pnpm Workspace
Turborepo
Vitest
Playwright
Docker
GitHub Actions
Sentry
```

Mục tiêu chính của kiến trúc là:

- Không khóa website vào Pokémon.
- Không hard-code nghiệp vụ thương mại.
- Dễ thêm thương hiệu và dòng sản phẩm.
- Có commerce core ổn định.
- Có khả năng phát triển công cụ thiết kế riêng.
- Dễ bảo trì.
- Dễ kiểm thử.
- Dễ triển khai.
- Có thể mở rộng dần theo tăng trưởng kinh doanh.
