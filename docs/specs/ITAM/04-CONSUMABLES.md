# MODULE: CONSUMABLES (Quản lý Vật tư tiêu hao)

## 1. Mục tiêu nghiệp vụ

- Quản lý vật tư tiêu hao IT: mực in, giấy in, dây cáp mạng, pin...
- Theo dõi số lượng tồn kho và mức tiêu thụ
- Cảnh báo reorder khi tồn kho thấp
- Hỗ trợ xuất kho và tracking sử dụng

---

## 2. Đối tượng dữ liệu

### 2.1 Consumable Model (Mẫu vật tư)

| Trường | Mô tả | Bắt buộc | Ràng buộc |
|--------|-------|:--------:|-----------|
| Mã mẫu | Mã định danh | ● | Unique |
| Tên mẫu | Tên vật tư | ● | Tối đa 200 ký tự |
| Danh mục | ink / paper / cable / battery / cleaning / other | ● | Enum |
| Nhà sản xuất | Manufacturer | ○ | FK |
| Số model | Part number | ○ | String |
| Đơn vị tính | Hộp, cuộn, cái, mét... | ● | String |
| Số lượng | Total quantity | ● | ≥ 0 |
| Ngưỡng tối thiểu | Reorder point | ○ | ≥ 0 |
| Đơn giá | Unit price | ○ | ≥ 0 |
| Nhà cung cấp | Supplier | ○ | FK |
| Vị trí lưu kho | Location | ○ | FK |
| Ghi chú | Notes | ○ | Text |

### 2.2 Consumable Issue (Xuất kho vật tư)

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Consumable Model | Thuộc mẫu nào | ● |
| Số lượng | Quantity issued | ● |
| Loại xuất | user / department / asset / general | ● |
| User nhận | Nếu xuất cho user | ○ |
| Department | Nếu xuất cho phòng ban | ○ |
| Asset | Nếu xuất cho asset (mực cho máy in) | ○ |
| Ngày xuất | Issue date | ● |
| Người xuất | Issued by | ● |
| Ghi chú | Notes | ○ |

---

## 3. Các màn hình/chức năng chính

### MH-CON-01: Danh sách Vật tư

**Mô tả**: Hiển thị danh sách vật tư tiêu hao

**Các cột hiển thị**:
- Mã mẫu
- Tên mẫu
- Danh mục
- Đơn vị
- Tồn kho / Reorder point
- Vị trí
- Trạng thái

**Badge trạng thái**:
- 🟢 Đủ: Quantity > Reorder point
- 🟡 Sắp hết: Quantity ≤ Reorder point và > 0
- 🔴 Hết: Quantity = 0

**Actions**:
- Xem chi tiết
- Xuất kho
- Nhập kho

---

### MH-CON-02: Chi tiết Vật tư

**Tab Thông tin chung**:
- Thông tin mẫu
- Usage statistics
- Consumption trend chart

**Tab Lịch sử xuất**:
- Danh sách lần xuất
- Filter theo thời gian, người nhận, loại xuất

**Tab Nhập kho**:
- Lịch sử nhập
- Thông tin PO, ngày, số lượng

---

### MH-CON-03: Xuất kho Vật tư

**Mô tả**: Form xuất vật tư

**Workflow**:
```
1. Chọn mẫu vật tư
2. Nhập số lượng xuất
3. Chọn loại xuất:
   - Cho User: Tìm chọn user
   - Cho Phòng ban: Chọn department
   - Cho Asset: Tìm chọn asset (vd: máy in)
   - General: Không chỉ định
4. Ghi chú (optional)
5. Xác nhận
```

**Validation**:
- Số lượng xuất ≤ available
- User/Asset phải active

---

### MH-CON-04: Nhập kho Vật tư

**Workflow**:
```
1. Chọn mẫu vật tư
2. Nhập số lượng nhập
3. Thông tin mua hàng (PO, ngày, giá - optional)
4. Xác nhận
```

---

## 4. Quy trình nghiệp vụ

### 4.1 Consumable Flow

```
┌──────────┐   Receive   ┌──────────┐   Issue   ┌──────────┐
│  ORDERED │ ──────────► │ IN STOCK │ ────────► │  CONSUMED │
└──────────┘             └──────────┘           └──────────┘
                              │
                              │ Reorder point reached
                              ▼
                         [ALERT SENT]
```

### 4.2 Consumption Tracking

**Theo dõi consumption theo**:
- Thời gian (daily/weekly/monthly)
- User/Department
- Asset (cho mực in, pin...)
- Location

**Reports**:
- Top consumers
- Consumption trend
- Cost analysis

---

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Loại | Mô tả |
|----|---------|------|-------|
| CON-R01 | Không vượt tồn | Hard | Số lượng xuất ≤ available |
| CON-R02 | Số dương | Hard | Số lượng > 0 |
| CON-R03 | Reorder alert | Soft | Quantity ≤ reorder_point → alert |
| CON-R04 | Zero stock | Soft | Quantity = 0 → prevent issue |
| CON-R05 | Active recipient | Hard | Chỉ xuất cho user/asset active |
| CON-R06 | Track ink to printer | Soft | Mực in nên link với máy in cụ thể |

---

## 6. Phân quyền chi tiết

| Hành động | Requester | Approver | Warehouse/IT | Asset Manager | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-----:|
| Xem danh sách | ✗ | ● | ● | ● | ● |
| Xem chi tiết | ✗ | ● | ● | ● | ● |
| Tạo mới | ✗ | ✗ | ● | ● | ● |
| Sửa thông tin | ✗ | ✗ | ● | ● | ● |
| Xuất kho | ✗ | ✗ | ● | ● | ● |
| Nhập kho | ✗ | ✗ | ● | ● | ● |
| Xóa | ✗ | ✗ | ✗ | ● | ● |
| Export | ✗ | ● | ● | ● | ● |

---

## 7. Thông báo & Cảnh báo

| Sự kiện | Kênh | Người nhận | Tần suất |
|---------|------|------------|----------|
| Đạt reorder point | In-app, Email | Warehouse, Asset Manager | Khi xảy ra |
| Hết hàng | Email, In-app | Warehouse, Asset Manager | Khi xảy ra |
| High consumption | In-app | Asset Manager | Weekly summary |

---

## 8. Tiêu chí nghiệm thu

### AC-CON-01: Xuất kho vật tư

```gherkin
Given   Mực in HP có 50 hộp trong kho
When    Warehouse xuất 5 hộp cho máy in #PRT-001
Then    Issue record được tạo với asset = #PRT-001
And     Tồn kho giảm còn 45
And     Audit log ghi nhận
```

### AC-CON-02: Cảnh báo reorder

```gherkin
Given   Giấy A4 có reorder_point = 10 ream
And     Tồn kho hiện tại = 12 ream
When    Xuất 5 ream cho Phòng Kế toán
Then    Tồn kho = 7 < reorder_point
And     Cảnh báo "Sắp hết hàng" hiển thị
And     Email gửi đến Warehouse
```

### AC-CON-03: Consumption report

```gherkin
Given   Có dữ liệu xuất vật tư trong tháng
When    Asset Manager chạy Consumption Report
Then    Hiển thị breakdown theo Department
And     Hiển thị top 5 items tiêu thụ nhiều nhất
And     Hiển thị trend so với tháng trước
```
