# MODULE: ACCESSORIES (Quản lý Phụ kiện)

## 1. Mục tiêu nghiệp vụ

- Quản lý các phụ kiện IT như chuột, bàn phím, adapter, cáp, ổ cứng ngoài...
- Theo dõi số lượng tồn kho và cảnh báo khi thấp
- Gán phụ kiện cho user hoặc asset (máy tính)
- Hỗ trợ checkout/checkin với đầy đủ lịch sử

---

## 2. Đối tượng dữ liệu

### 2.1 Accessory Model (Mẫu phụ kiện)

| Trường | Mô tả | Bắt buộc | Ràng buộc |
|--------|-------|:--------:|-----------|
| Mã mẫu | Mã định danh | ● | Unique |
| Tên mẫu | Tên phụ kiện | ● | Tối đa 200 ký tự |
| Nhà sản xuất | Manufacturer | ○ | FK Manufacturer |
| Số model | Model number | ○ | String |
| Danh mục | Category | ● | FK Category |
| Hình ảnh | Product image | ○ | Image URL |
| Số lượng | Total quantity | ● | ≥ 0 |
| Ngưỡng tối thiểu | Min quantity alert | ○ | ≥ 0 |
| Đơn giá | Unit price | ○ | ≥ 0 |
| Nhà cung cấp | Supplier | ○ | FK Supplier |
| Số hóa đơn | Purchase order | ○ | Reference |
| Ngày mua | Purchase date | ○ | Date |
| Vị trí lưu kho | Location | ○ | FK Location |
| Ghi chú | Notes | ○ | Text |
| Tổ chức | Org | ● | FK |

### 2.2 Accessory Checkout (Phiên gán phụ kiện)

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Accessory Model | Thuộc mẫu nào | ● |
| Số lượng | Số lượng xuất | ● |
| Loại gán | user / asset | ● |
| User được gán | Nếu gán cho user | ○ |
| Asset được gán | Nếu gán cho asset | ○ |
| Ngày checkout | Checkout date | ● |
| Người thực hiện | Checked out by | ● |
| Ngày dự kiến trả | Expected checkin | ○ |
| Ghi chú | Notes | ○ |
| Trạng thái | checked_out / returned | ● |

---

## 3. Các màn hình/chức năng chính

### MH-ACC-01: Danh sách Phụ kiện

**Mô tả**: Hiển thị danh sách tất cả mẫu phụ kiện

**Các cột hiển thị**:
- Hình ảnh (thumbnail)
- Mã mẫu
- Tên mẫu
- Nhà sản xuất
- Danh mục
- Tồn kho (Available/Total) - hiển thị "15/20"
- Vị trí
- Trạng thái (với badge màu)

**Badge trạng thái**:
- 🟢 Đủ: Available > Min qty
- 🟡 Thấp: Available ≤ Min qty và > 0
- 🔴 Hết: Available = 0

**Bộ lọc**:
- Danh mục (multi-select)
- Nhà sản xuất
- Vị trí
- Trạng thái tồn kho (Đủ/Thấp/Hết)

**Actions**:
- Xem chi tiết
- Sửa
- Checkout
- Clone

---

### MH-ACC-02: Chi tiết Phụ kiện

**Mô tả**: Hiển thị đầy đủ thông tin mẫu phụ kiện

**Tab Thông tin chung**:
- Hình ảnh lớn
- Thông tin mẫu
- Thông tin mua hàng
- Usage stats (tổng checkout, đang sử dụng, trả lại)

**Tab Đang sử dụng**:
- Danh sách checkout đang active
- Cột: User/Asset, Số lượng, Ngày checkout, Người xuất, Actions
- Action: Checkin (trả lại)

**Tab Lịch sử**:
- Timeline checkout/checkin
- Filter theo thời gian

---

### MH-ACC-03: Checkout Phụ kiện

**Mô tả**: Form xuất phụ kiện cho user hoặc asset

**Workflow**:
```
1. Chọn mẫu phụ kiện (nếu từ danh sách đã có)
2. Nhập số lượng cần xuất
3. Chọn loại gán (user/asset)
4. Tìm kiếm và chọn user/asset
5. Nhập ngày dự kiến trả (optional)
6. Ghi chú (optional)
7. Xác nhận
```

**Validation**:
- Số lượng xuất ≤ Available quantity
- User/Asset phải active

**Kết quả**:
- Tạo checkout record
- Giảm available quantity
- Gửi notification cho user (nếu checkout cho user)

---

### MH-ACC-04: Checkin Phụ kiện

**Mô tả**: Form nhận lại phụ kiện

**Workflow**:
```
1. Chọn checkout record (từ chi tiết hoặc danh sách)
2. Nhập số lượng trả (mặc định = số đã checkout)
3. Ghi chú tình trạng (optional)
4. Xác nhận
```

**Kết quả**:
- Cập nhật checkout record thành returned
- Tăng available quantity
- Ghi audit log

---

### MH-ACC-05: Nhập thêm số lượng

**Mô tả**: Form bổ sung số lượng phụ kiện vào kho

**Workflow**:
```
1. Chọn mẫu phụ kiện
2. Nhập số lượng nhập thêm
3. Nhập thông tin mua (PO, ngày, giá - optional)
4. Xác nhận
```

**Kết quả**:
- Tăng total quantity và available quantity
- Ghi audit log

---

## 4. Quy trình nghiệp vụ

### 4.1 Checkout/Checkin Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ACCESSORY LIFECYCLE                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐  Purchase   ┌──────────┐  Checkout   ┌──────────────┐
│  ORDERED │ ──────────► │ IN STOCK │ ──────────► │ CHECKED OUT  │
└──────────┘             └──────────┘             └──────────────┘
                              ▲                          │
                              │                          │
                              │       Checkin            │
                              └──────────────────────────┘
```

### 4.2 Cập nhật số lượng

| Sự kiện | Available | Total |
|---------|-----------|-------|
| Nhập mới/bổ sung | +n | +n |
| Checkout | -n | = |
| Checkin | +n | = |
| Điều chỉnh kiểm kê | ±n | ±n |
| Hỏng/mất | -n | -n |

---

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Loại | Mô tả |
|----|---------|------|-------|
| ACC-R01 | Không vượt tồn | Hard | Số lượng checkout ≤ available quantity |
| ACC-R02 | Số dương | Hard | Số lượng checkout/checkin > 0 |
| ACC-R03 | Return ≤ Checked out | Hard | Số lượng trả ≤ số đã checkout |
| ACC-R04 | Low stock alert | Soft | Available ≤ min_qty → hiển thị cảnh báo |
| ACC-R05 | Out of stock | Soft | Available = 0 → hiển thị "Hết hàng" |
| ACC-R06 | Active target | Hard | Chỉ checkout cho user/asset đang active |

---

## 6. Phân quyền chi tiết

| Hành động | Requester | Approver | Warehouse/IT | Asset Manager | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-----:|
| Xem danh sách | ○¹ | ● | ● | ● | ● |
| Xem chi tiết | ○¹ | ● | ● | ● | ● |
| Tạo mới | ✗ | ✗ | ● | ● | ● |
| Sửa thông tin | ✗ | ✗ | ● | ● | ● |
| Checkout | ✗ | ✗ | ● | ● | ● |
| Checkin | ✗ | ✗ | ● | ● | ● |
| Nhập bổ sung | ✗ | ✗ | ● | ● | ● |
| Xóa | ✗ | ✗ | ✗ | ● | ● |
| Export | ✗ | ● | ● | ● | ● |

> ¹ Chỉ xem phụ kiện đang được checkout cho mình

---

## 7. Thông báo & Cảnh báo

| Sự kiện | Kênh | Người nhận | Tần suất |
|---------|------|------------|----------|
| Tồn kho thấp (≤ min) | In-app, Email | Warehouse, Asset Manager | Khi xảy ra |
| Hết hàng | Email, In-app | Warehouse, Asset Manager | Khi xảy ra |
| Checkout cho user | In-app | User được nhận | Ngay lập tức |
| Quá hạn trả (overdue) | Email, In-app | User, Warehouse | Hàng ngày |

---

## 8. Nhật ký (Audit Trail)

| Sự kiện | Thông tin ghi nhận |
|---------|-------------------|
| Tạo mẫu mới | Ai tạo, thông tin mẫu |
| Sửa thông tin | Ai sửa, field thay đổi |
| Nhập bổ sung | Ai nhập, số lượng, thông tin PO |
| Checkout | Ai checkout, cho ai, số lượng |
| Checkin | Ai checkin, từ ai, số lượng, tình trạng |
| Điều chỉnh số lượng | Ai điều chỉnh, số cũ/mới, lý do |

---

## 9. Tiêu chí nghiệm thu (Acceptance Criteria)

### AC-ACC-01: Checkout phụ kiện

```gherkin
Given   Mẫu chuột Logitech có 20 available
When    Warehouse checkout 2 chuột cho User A
Then    Checkout record được tạo
And     Available giảm còn 18
And     User A nhận notification "Bạn vừa được gán 2 chuột Logitech"
```

### AC-ACC-02: Ngăn checkout vượt tồn

```gherkin
Given   Mẫu adapter có 5 available
When    Cố checkout 10 adapter
Then    Hệ thống từ chối với thông báo "Không đủ số lượng tồn kho"
And     Available vẫn là 5
```

### AC-ACC-03: Checkin phụ kiện

```gherkin
Given   User A đang giữ 2 chuột từ checkout #123
When    Warehouse checkin 2 chuột
Then    Checkout #123 đánh dấu returned
And     Available tăng thêm 2
And     Audit log ghi nhận
```

### AC-ACC-04: Cảnh báo tồn kho thấp

```gherkin
Given   Mẫu bàn phím có min_qty = 5
And     Available hiện tại = 6
When    Checkout 2 bàn phím
Then    Available = 4 < min_qty
And     Badge chuyển sang "Thấp" (màu vàng)
And     Email gửi đến Asset Manager
```

### AC-ACC-05: Checkin một phần

```gherkin
Given   User A đang giữ 5 ổ cứng từ checkout #456
When    Warehouse checkin 3 ổ cứng
Then    Available tăng 3
And     Checkout #456 vẫn checked_out với 2 remaining
```
