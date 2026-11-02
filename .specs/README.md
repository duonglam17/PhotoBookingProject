# Trung Tâm Khế Ước Kỹ Thuật (.specs)
> **Single Source of Truth (Nguồn chân lý duy nhất)** phục vụ cho sự cộng tác giữa các AI Agents.

---

## 1. Mục Đích
Thư mục `.specs/` là nơi lưu trữ các bản khế ước kỹ thuật (**API Contracts & Architecture Blueprints**) do **`tech-lead-architect`** sinh ra. 

Tất cả các tác tử triển khai mã nguồn:
- **`backend-builder`**: Chỉ được phép viết API, routes, controllers khớp 100% với file contract trong này.
- **`frontend-builder`**: Chỉ được phép dựng giao diện và gọi hàm API theo đúng các endpoint và payload trong này.

---

## 2. Quy Chuẩn Đặt Tên File
Mỗi tính năng tương ứng với một file JSON có cấu trúc:
```
.specs/<feature-name>.contract.json
```
Ví dụ:
- `.specs/booking-status-update.contract.json`
- `.specs/photographer-portfolio-filter.contract.json`

---

## 3. Cấu Trúc Khế Ước Chuẩn
Xem file mẫu tham khảo tại: `_template.contract.json`.
Mỗi bản contract bắt buộc phải chứa:
1. `endpoints`: Danh sách API (Method, Path, Auth roles, Request Body, Response Envelope 200/400/401/403/500).
2. `databaseRequirements`: Tác động cơ sở dữ liệu nếu có.
3. `frontendRequirements`: Tương tác giao diện và các trạng thái UI bắt buộc (Loading, Error, Success).
4. `acceptanceCriteria`: Tiêu chí nghiệm thu để chạy kiểm thử tự động.

