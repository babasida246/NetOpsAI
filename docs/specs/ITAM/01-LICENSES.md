# MODULE: LICENSES (Quản lý Bản quyền)

## 1. Mục tiêu nghiệp vụ

- Quản lý toàn bộ bản quyền phần mềm của tổ chức
- Theo dõi số lượng seat đã sử dụng vs. được phép
- Cảnh báo license sắp hết hạn hoặc vượt seat
- Gán/thu hồi license cho user hoặc asset
- Đảm bảo tuân thủ pháp lý (license compliance)

---

## 2. Đối tượng dữ liệu

### 2.1 License (Bản quyền)

| Trường | Mô tả | Bắt buộc | Ràng buộc |
|--------|-------|:--------:|-----------|
| Mã license | Mã định danh duy nhất | ● | Unique, auto-generate hoặc nhập tay |
| Tên phần mềm | Tên software/product | ● | Tối đa 200 ký tự |
| Nhà cung cấp | Vendor/Publisher | ● | Chọn từ danh mục Supplier |
| Loại license | per-seat / per-device / per-user / site-license / unlimited | ● | Enum |
| Product Key | Khóa license | ○ | Encrypted storage |
| Số lượng seat | Số seat được phép | ● | ≥ 1 (trừ unlimited) |
| Đơn giá | Giá mua mỗi seat | ○ | ≥ 0 |
| Ngày mua | Purchase date | ● | Date |
| Ngày hết hạn | Expiration date | ○ | Date, null = perpetual |
| Ngày bảo hành | Warranty/Support end | ○ | Date |
| Số hóa đơn | Invoice/PO number | ○ | Reference |
| Ghi chú | Notes | ○ | Text |
| Trạng thái | draft / active / expired / retired | ● | Enum |
| Tổ chức | Thuộc org nào | ● | FK |
| Danh mục | Category | ○ | FK |

### 2.2 License Seat (Seat được gán)

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| License | Thuộc license nào | ● |
| Loại gán | user / asset | ● |
| User được gán | Nếu gán cho user | ○ |
| Asset được gán | Nếu gán cho asset | ○ |
| Ngày gán | Assignment date | ● |
| Người gán | Assigned by | ● |
| Ghi chú | Notes | ○ |

---

## 3. Các màn hình/chức năng chính

### MH-LIC-01: Danh sách License

**Mô tả**: Hiển thị danh sách tất cả licenses với khả năng tìm kiếm, lọc, sắp xếp

**Các cột hiển thị**:
- Mã license
- Tên phần mềm
- Vendor
- Loại license
- Seat (used/total) - hiển thị dạng "5/10"
- Ngày hết hạn
- Trạng thái (với màu sắc)

**Bộ lọc**:
- Trạng thái (multi-select)
- Loại license
- Vendor
- Sắp hết hạn (trong 30/60/90 ngày)
- Vượt seat (checkbox)

**Sắp xếp**: Tên, Ngày hết hạn, % sử dụng seat

**Actions**:
- Xem chi tiết
- Sửa
- Clone
- Retire
- Gán seat

---

### MH-LIC-02: Chi tiết License

**Mô tả**: Hiển thị đầy đủ thông tin license và các tab liên quan

**Tab Thông tin chung**:
- Hiển thị/sửa thông tin license
- Hiển thị usage chart (pie chart seats)

**Tab Seats**:
- Danh sách seat đã gán
- Cột: User/Asset, Ngày gán, Người gán, Actions
- Nút: Gán thêm seat, Thu hồi

**Tab Lịch sử**:
- Timeline các thay đổi
- Gán, thu hồi, sửa thông tin

**Tab Tài liệu**:
- Đính kèm hợp đồng, hóa đơn
- Upload/Download files

---

### MH-LIC-03: Gán License Seat

**Mô tả**: Form gán license cho user hoặc asset

**Workflow**:
1. Chọn loại gán (user/asset)
2. Tìm kiếm user/asset
3. Nhập ghi chú (optional)
4. Xác nhận

**Validation**:
- Không vượt số seat cho phép
- User/Asset chưa có seat của license này

---

### MH-LIC-04: Thu hồi License Seat

**Mô tả**: Thu hồi seat đã gán

**Workflow**:
1. Chọn seat cần thu hồi
2. Nhập lý do (optional)
3. Xác nhận

**Kết quả**: Seat trở về trạng thái available

---

## 4. Quy trình nghiệp vụ

### 4.1 Vòng đời License

```
┌─────────┐    Activate    ┌─────────┐    Expire/Retire    ┌─────────────┐
│  DRAFT  │ ─────────────► │  ACTIVE │ ──────────────────► │EXPIRED/RETIRED│
└─────────┘                └─────────┘                     └─────────────┘
     │                          │                                │
     │ Delete                   │ Edit seats                     │ Reactivate
     ▼                          ▼                                │ (nếu renew)
  [Deleted]               [Seat assigned/revoked]                ▼
                                                           ┌─────────┐
                                                           │  ACTIVE │
                                                           └─────────┘
```

### 4.2 Điều kiện chuyển trạng thái

| Từ | Đến | Điều kiện | Actor |
|----|-----|-----------|-------|
| Draft | Active | Đủ thông tin bắt buộc | Asset Manager |
| Active | Expired | Ngày hiện tại > Ngày hết hạn (auto) | System |
| Active | Retired | Quyết định ngừng sử dụng, đã thu hồi hết seat | Asset Manager |
| Expired | Active | Gia hạn license (cập nhật ngày hết hạn mới) | Asset Manager |

---

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Loại | Mô tả |
|----|---------|------|-------|
| LIC-R01 | Không vượt seat | Hard | Số seat đã gán không được vượt số seat được phép |
| LIC-R02 | Chỉ gán từ Active | Hard | Không thể gán seat từ license Draft hoặc Retired |
| LIC-R03 | Unique assignment | Hard | Một user/asset chỉ được gán 1 seat của cùng 1 license |
| LIC-R04 | Revoke before retire | Hard | Khi retire license, phải thu hồi hết seat trước |
| LIC-R05 | Expiry warning | Soft | License hết hạn trong 30 ngày → hiển thị cảnh báo |
| LIC-R06 | Usage warning | Soft | Sử dụng ≥ 90% seat → hiển thị cảnh báo |
| LIC-R07 | Encrypt product key | Hard | Product Key phải được mã hóa khi lưu trữ |

---

## 6. Phân quyền chi tiết

| Hành động | Requester | Approver | Warehouse/IT | Asset Manager | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-----:|
| Xem danh sách | ○¹ | ● | ● | ● | ● |
| Xem chi tiết | ○¹ | ● | ● | ● | ● |
| Tạo mới | ✗ | ✗ | ✗ | ● | ● |
| Sửa thông tin | ✗ | ✗ | ✗ | ● | ● |
| Gán seat | ✗ | ✗ | ● | ● | ● |
| Thu hồi seat | ✗ | ✗ | ● | ● | ● |
| Retire | ✗ | ✗ | ✗ | ● | ● |
| Xóa (Draft) | ✗ | ✗ | ✗ | ● | ● |
| Export | ✗ | ● | ● | ● | ● |

> ¹ Chỉ xem license đang được gán cho mình

---

## 7. Thông báo & Cảnh báo

| Sự kiện | Kênh | Người nhận | Tần suất |
|---------|------|------------|----------|
| License hết hạn trong 30 ngày | Email, In-app | Asset Manager, Admin | 1 lần/tuần |
| License hết hạn trong 7 ngày | Email, In-app | Asset Manager, Admin | Hàng ngày |
| License đã hết hạn | Email, In-app | Asset Manager, Admin | 1 lần |
| Sử dụng ≥ 90% seat | In-app | Asset Manager | Khi xảy ra |
| Vượt seat (over-licensed) | Email, In-app | Asset Manager, Admin | Ngay lập tức |

---

## 8. Nhật ký (Audit Trail)

Các sự kiện cần ghi nhận:

| Sự kiện | Thông tin ghi nhận |
|---------|-------------------|
| Tạo license mới | Ai tạo, thông tin license |
| Sửa thông tin | Ai sửa, field nào, giá trị trước/sau |
| Chuyển trạng thái | Trạng thái cũ → mới, ai thực hiện |
| Gán seat | License, User/Asset, ai gán |
| Thu hồi seat | License, User/Asset, ai thu hồi, lý do |
| Export dữ liệu | Ai export, định dạng, filter |

---

## 9. Tiêu chí nghiệm thu (Acceptance Criteria)

### AC-LIC-01: Tạo License mới

```gherkin
Given   Tôi là Asset Manager đã đăng nhập
When    Tôi điền đầy đủ thông tin license và nhấn Lưu
Then    License được tạo với trạng thái Draft
And     Audit log ghi nhận việc tạo mới
```

### AC-LIC-02: Gán seat không vượt quota

```gherkin
Given   License có 10 seat, đã gán 9 seat
When    Tôi gán thêm 1 seat cho user
Then    Seat được gán thành công
And     Hiển thị "10/10 seats used"
```

### AC-LIC-03: Ngăn vượt seat

```gherkin
Given   License có 10 seat, đã gán 10 seat
When    Tôi cố gán thêm 1 seat
Then    Hệ thống từ chối với thông báo "Không thể gán: đã đạt giới hạn seat"
And     Không có seat nào được gán thêm
```

### AC-LIC-04: Cảnh báo sắp hết hạn

```gherkin
Given   License có ngày hết hạn trong 25 ngày
When    Job cảnh báo chạy hàng ngày
Then    Asset Manager nhận email thông báo license sắp hết hạn
```

### AC-LIC-05: Tự động chuyển Expired

```gherkin
Given   License Active có ngày hết hạn là hôm qua
When    Job xử lý hết hạn chạy
Then    License tự động chuyển sang Expired
And     Audit log ghi nhận
And     Thông báo gửi đến Asset Manager
```

### AC-LIC-06: Thu hồi seat

```gherkin
Given   User A đang giữ 1 seat của license X
When    Asset Manager thu hồi seat với lý do "Nghỉ việc"
Then    Seat được giải phóng
And     Available seats tăng lên 1
And     Audit log ghi nhận với lý do
```

### AC-LIC-07: Retire license

```gherkin
Given   License có 0 seat đang gán
When    Asset Manager nhấn Retire
Then    License chuyển trạng thái Retired
And     Không thể gán seat mới

Given   License còn seat đang gán
When    Asset Manager nhấn Retire
Then    Hệ thống yêu cầu thu hồi hết seat trước
```
