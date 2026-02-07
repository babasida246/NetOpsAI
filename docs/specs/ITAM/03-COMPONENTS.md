# MODULE: COMPONENTS (Quản lý Linh kiện)

## 1. Mục tiêu nghiệp vụ

- Quản lý linh kiện thay thế/nâng cấp: RAM, SSD, CPU, Card màn hình...
- Theo dõi linh kiện đã lắp vào asset nào
- Quản lý số lượng tồn kho và reorder point
- Hỗ trợ nâng cấp/thay thế linh kiện trong maintenance

---

## 2. Đối tượng dữ liệu

### 2.1 Component Model (Mẫu linh kiện)

| Trường | Mô tả | Bắt buộc | Ràng buộc |
|--------|-------|:--------:|-----------|
| Mã mẫu | Mã định danh | ● | Unique |
| Tên mẫu | Tên linh kiện | ● | Tối đa 200 ký tự |
| Loại linh kiện | ram / ssd / hdd / cpu / gpu / psu / motherboard / other | ● | Enum |
| Nhà sản xuất | Manufacturer | ○ | FK |
| Số model | Model/Part number | ○ | String |
| Thông số kỹ thuật | Specs (dung lượng, tốc độ...) | ○ | Text |
| Serial number | S/N nếu có | ○ | Unique per item |
| Số lượng | Total quantity | ● | ≥ 0 |
| Ngưỡng tối thiểu | Min quantity | ○ | ≥ 0 |
| Đơn giá | Unit price | ○ | ≥ 0 |
| Nhà cung cấp | Supplier | ○ | FK |
| Vị trí lưu kho | Location | ○ | FK |
| Ghi chú | Notes | ○ | Text |

### 2.2 Component Assignment (Gán linh kiện vào Asset)

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Component Model | Thuộc mẫu nào | ● |
| Số lượng | Quantity assigned | ● |
| Asset | Gán vào asset nào | ● |
| Serial numbers | Danh sách S/N (nếu tracked) | ○ |
| Ngày lắp | Installation date | ● |
| Người thực hiện | Installed by | ● |
| Ghi chú | Notes | ○ |
| Trạng thái | installed / removed | ● |

---

## 3. Các màn hình/chức năng chính

### MH-COM-01: Danh sách Linh kiện

**Mô tả**: Hiển thị danh sách mẫu linh kiện

**Các cột hiển thị**:
- Mã mẫu
- Tên mẫu
- Loại
- Thông số
- Tồn kho (Available/Total)
- Vị trí
- Trạng thái

**Bộ lọc**:
- Loại linh kiện
- Nhà sản xuất
- Vị trí
- Trạng thái tồn kho

**Actions**:
- Xem chi tiết
- Sửa
- Gán vào Asset
- Nhập bổ sung

---

### MH-COM-02: Chi tiết Linh kiện

**Tab Thông tin chung**:
- Thông tin mẫu linh kiện
- Thông số kỹ thuật
- Usage stats

**Tab Đang sử dụng**:
- Danh sách đang lắp trong asset nào
- Cột: Asset, Số lượng, Serial, Ngày lắp, Actions
- Action: Gỡ bỏ

**Tab Lịch sử**:
- Timeline lắp/gỡ

---

### MH-COM-03: Gán Linh kiện vào Asset

**Mô tả**: Form lắp linh kiện vào thiết bị

**Workflow**:
```
1. Chọn mẫu linh kiện
2. Nhập số lượng
3. Tìm và chọn Asset đích
4. Nhập Serial numbers (nếu tracked)
5. Ghi chú (optional)
6. Xác nhận
```

**Validation**:
- Asset phải là loại có thể lắp linh kiện (laptop, desktop, server)
- Số lượng ≤ available
- Serial number unique

---

### MH-COM-04: Gỡ bỏ Linh kiện

**Mô tả**: Gỡ linh kiện khỏi thiết bị

**Workflow**:
```
1. Chọn assignment record
2. Lý do gỡ (upgrade / repair / decommission)
3. Trạng thái linh kiện (restock / dispose)
4. Xác nhận
```

**Kết quả**:
- Nếu restock: tăng available quantity
- Nếu dispose: giảm total quantity

---

## 4. Quy trình nghiệp vụ

### 4.1 Component Lifecycle

```
┌─────────┐  Purchase   ┌──────────┐  Install   ┌───────────┐
│ ORDERED │ ──────────► │ IN STOCK │ ─────────► │ INSTALLED │
└─────────┘             └──────────┘            └───────────┘
                              ▲                       │
                              │                       │
                    Restock   │    Remove             │
                              └───────────────────────┘
                                        │
                                        │ Dispose
                                        ▼
                                   [DISPOSED]
```

### 4.2 Compatibility Matrix

| Loại linh kiện | Laptop | Desktop | Server | Network | Other |
|----------------|:------:|:-------:|:------:|:-------:|:-----:|
| RAM | ● | ● | ● | ✗ | ✗ |
| SSD/HDD | ● | ● | ● | ✗ | ✗ |
| CPU | ● | ● | ● | ✗ | ✗ |
| GPU | ○ | ● | ● | ✗ | ✗ |
| PSU | ✗ | ● | ● | ✗ | ✗ |
| Network Card | ○ | ● | ● | ✗ | ✗ |

> ● Thường xuyên, ○ Có thể, ✗ Không áp dụng

---

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Loại | Mô tả |
|----|---------|------|-------|
| COM-R01 | Không vượt tồn | Hard | Số lượng install ≤ available |
| COM-R02 | Asset type check | Soft | Cảnh báo nếu loại asset không phù hợp |
| COM-R03 | Unique Serial | Hard | Serial number unique across installed components |
| COM-R04 | Low stock alert | Soft | Available ≤ min_qty → cảnh báo |
| COM-R05 | Active Asset | Hard | Chỉ lắp vào asset đang active |
| COM-R06 | Disposed no restock | Hard | Linh kiện dispose không thể restock |

---

## 6. Phân quyền chi tiết

| Hành động | Requester | Approver | Warehouse/IT | Asset Manager | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-----:|
| Xem danh sách | ✗ | ● | ● | ● | ● |
| Xem chi tiết | ✗ | ● | ● | ● | ● |
| Tạo mới | ✗ | ✗ | ● | ● | ● |
| Sửa thông tin | ✗ | ✗ | ● | ● | ● |
| Gán vào Asset | ✗ | ✗ | ● | ● | ● |
| Gỡ bỏ | ✗ | ✗ | ● | ● | ● |
| Nhập bổ sung | ✗ | ✗ | ● | ● | ● |
| Dispose | ✗ | ✗ | ✗ | ● | ● |
| Export | ✗ | ● | ● | ● | ● |

---

## 7. Thông báo & Cảnh báo

| Sự kiện | Kênh | Người nhận | Tần suất |
|---------|------|------------|----------|
| Tồn kho thấp | In-app, Email | Warehouse, Asset Manager | Khi xảy ra |
| Hết hàng | Email, In-app | Warehouse, Asset Manager | Khi xảy ra |
| Linh kiện critical hết | Email | Asset Manager, Admin | Ngay lập tức |

---

## 8. Tiêu chí nghiệm thu

### AC-COM-01: Lắp linh kiện

```gherkin
Given   RAM 16GB có 10 available
When    IT lắp 2 RAM vào Laptop #LAP-001
Then    Assignment record được tạo
And     Available giảm còn 8
And     Laptop #LAP-001 hiển thị "RAM: 2x 16GB"
```

### AC-COM-02: Gỡ và Restock

```gherkin
Given   Laptop #LAP-001 có 2 RAM đang lắp
When    IT gỡ 1 RAM và chọn Restock
Then    Available tăng lên 1
And     Laptop #LAP-001 hiển thị "RAM: 1x 16GB"
```

### AC-COM-03: Gỡ và Dispose

```gherkin
Given   SSD 256GB total = 20, available = 5
And     Laptop #LAP-002 có 1 SSD lắp
When    IT gỡ SSD và chọn Dispose (lý do: hỏng)
Then    Total giảm còn 19
And     Available vẫn = 5
And     Audit log ghi nhận dispose
```

### AC-COM-04: Serial tracking

```gherkin
Given   IT lắp SSD S/N "SSD-12345" vào Desktop #DT-001
When    Xem chi tiết Desktop #DT-001
Then    Hiển thị component "SSD" với S/N "SSD-12345"

Given   SSD S/N "SSD-12345" đang lắp trong Desktop #DT-001
When    IT cố lắp cùng S/N vào máy khác
Then    Hệ thống từ chối "Serial number đã được sử dụng"
```
