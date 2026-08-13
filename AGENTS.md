# AGENTS.md

File này là luật làm việc bắt buộc cho AI coding agent.

## 1. Thứ tự ưu tiên

Khi có xung đột:

1. Yêu cầu mới nhất của user/ticket.
2. `AGENTS.md`.
3. Các file trong `/docs`.
4. Pattern hiện tại của codebase.
5. Suy đoán của AI.

Không được ưu tiên suy đoán hơn tài liệu.

## 2. Trước khi code

AI phải đọc các file liên quan:

- `docs/01-SYSTEM_REQUIREMENTS.md`
- `docs/03-PROJECT_STRUCTURE.md`
- `docs/04-DESIGN_SYSTEM.md`
- `docs/05-DATABASE_SCHEMA.md`
- `docs/06-API_SPEC.md`
- `docs/07-BUSINESS_RULES.md`
- `docs/08-AUTH_AND_PERMISSIONS.md`
- `docs/09-ADMIN_SYSTEM_REQUIREMENTS.md`

Không cần đọc mọi file cho task nhỏ nếu scope đã rõ, nhưng phải đọc file có liên quan trực tiếp.

## 3. Anti-drift

AI MUST:

- Chỉ sửa file cần thiết.
- Tái sử dụng component/helper/service hiện có.
- Giữ naming convention hiện tại.
- Giữ API contract hiện tại nếu ticket không yêu cầu đổi.
- Giữ backward compatibility nếu có thể.
- Thêm test cho business rule quan trọng.
- Chạy type-check, lint và build trước khi hoàn thành.

AI MUST NOT:

- Redesign trang không liên quan.
- Tự đổi màu/font/design token.
- Tự thêm dependency.
- Tự migration database lớn.
- Tự thêm feature “hay”.
- Tự đổi commerce engine.
- Tự thêm Redux/Zustand nếu chưa cần.
- Hard-code giá, promotion, inventory hoặc status logic trong UI.
- Bỏ permission check vì “chỉ là admin”.
- Viết business logic quan trọng trong React component.
- Để `console.log`, dead code hoặc TODO tạm trong production.

## 4. Phạm vi task

Mỗi task phải được hiểu theo phạm vi nhỏ nhất hợp lý.

Ví dụ ticket:

`Thêm production status vào order detail`

Được:
- UI status.
- API/service cần thiết.
- Type/model cần thiết.
- Permission.
- Validation status transition.
- Test.

Không được:
- Làm lại dashboard.
- Thêm Kanban board.
- Refactor toàn order system.
- Thêm notification nếu không được yêu cầu.

## 5. Khi yêu cầu mơ hồ

Ưu tiên:

1. Thay đổi ít nhất.
2. Reuse nhiều nhất.
3. Business rule hiện có.
4. Không phát minh feature.

Nếu có nhiều implementation tương đương, chọn cách đơn giản nhất và dễ bảo trì nhất.

## 6. Definition of Done

Task chỉ DONE khi:

- Type-check pass.
- Lint pass.
- Build pass.
- Không phá feature hiện tại.
- Có loading/error/empty state nếu liên quan.
- Responsive nếu là UI.
- Permission nếu là admin.
- Backend validation nếu là business action.
- Test critical path nếu liên quan business rule.
