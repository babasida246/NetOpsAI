# MODULE: DEPRECIATION (Khấu hao tài sản)

## 1. Mục tiêu nghiệp vụ

- Tính toán khấu hao tài sản theo quy định kế toán
- Hỗ trợ nhiều phương pháp khấu hao
- Tự động tính giá trị còn lại (book value)
- Báo cáo khấu hao theo kỳ kế toán

---

## 2. Đối tượng dữ liệu

### 2.1 Depreciation Schedule (Lịch khấu hao)

| Trường | Mô tả | Bắt buộc | Ràng buộc |
|--------|-------|:--------:|-----------|
| Asset | Tài sản | ● | FK Asset |
| Phương pháp | Depreciation method | ● | Enum |
| Nguyên giá | Original cost | ● | > 0 |
| Giá trị thanh lý | Salvage value | ● | ≥ 0 |
| Số năm khấu hao | Useful life (years) | ● | > 0 |
| Ngày bắt đầu | Depreciation start | ● | Date |
| Ngày kết thúc | Depreciation end | ● | Date (calculated) |
| Tổng đã khấu hao | Accumulated depreciation | ● | ≥ 0 |
| Giá trị còn lại | Book value | ● | Calculated |
| Trạng thái | active / fully_depreciated / stopped | ● | Enum |

### 2.2 Depreciation Entry (Bút toán khấu hao)

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Schedule | Thuộc schedule nào | ● |
| Kỳ | Period (month/year) | ● |
| Số tiền khấu hao | Depreciation amount | ● |
| Lũy kế | Accumulated | ● |
| Giá trị còn lại | Book value after | ● |
| Ngày ghi nhận | Entry date | ● |
| Posted | Đã hạch toán | ● |

### 2.3 Depreciation Methods

| Phương pháp | Mô tả | Công thức |
|-------------|-------|-----------|
| Straight-Line | Đường thẳng | (Cost - Salvage) / Life |
| Declining Balance | Số dư giảm dần | Book Value × Rate |
| Double Declining | Số dư giảm dần kép | Book Value × (2 / Life) |
| Sum of Years | Tổng số năm | (Cost - Salvage) × (Remaining / Sum) |
| Units of Production | Sản lượng | (Cost - Salvage) × (Units / Total Units) |

---

## 3. Các màn hình/chức năng chính

### MH-DEP-01: Depreciation Dashboard

**Widgets**:
- Tổng giá trị tài sản (original cost)
- Tổng khấu hao lũy kế
- Tổng giá trị còn lại
- Assets sắp hết khấu hao (6 tháng tới)
- Khấu hao tháng này

**Charts**:
- Depreciation by category (bar chart)
- Book value trend (line chart)

---

### MH-DEP-02: Depreciation List

**Cột hiển thị**:
- Asset (Tag + Name)
- Nguyên giá
- Phương pháp
- Số năm
- Đã khấu hao
- Còn lại
- % Depreciated
- Status

**Bộ lọc**:
- Category
- Status
- Phương pháp
- Sắp hết (trong 6/12 tháng)

---

### MH-DEP-03: Depreciation Detail

**Sections**:

**Thông tin khấu hao**:
- Asset info
- Depreciation settings
- Current values

**Schedule Table**:
| Kỳ | Khấu hao | Lũy kế | Còn lại | Status |
|----|----------|--------|---------|--------|
| 01/2024 | 1,000,000 | 1,000,000 | 11,000,000 | Posted |
| 02/2024 | 1,000,000 | 2,000,000 | 10,000,000 | Posted |
| 03/2024 | 1,000,000 | 3,000,000 | 9,000,000 | Pending |
| ... | ... | ... | ... | ... |

**Visualization**:
- Timeline chart của book value

---

### MH-DEP-04: Setup Depreciation

**Workflow**:
```
Step 1: Chọn Asset(s)
   - Single asset hoặc bulk
   - Chỉ assets chưa có depreciation
   
Step 2: Cấu hình
   - Nguyên giá (default = purchase price)
   - Giá trị thanh lý
   - Phương pháp khấu hao
   - Số năm khấu hao
   - Ngày bắt đầu
   
Step 3: Preview
   - Hiển thị schedule dự kiến
   - Monthly/Yearly breakdown
   
Step 4: Confirm
```

---

### MH-DEP-05: Run Depreciation

**Mô tả**: Chạy tính khấu hao theo kỳ

**Workflow**:
```
1. Chọn kỳ (tháng/năm)
2. System tự tính các entries
3. Review entries
4. Post entries
```

**Output**:
- Danh sách entries được tạo
- Tổng khấu hao kỳ này
- Export for accounting

---

### MH-DEP-06: Depreciation Reports

**Available Reports**:
- Depreciation Schedule by Asset
- Monthly Depreciation Summary
- Depreciation by Category
- Fully Depreciated Assets
- Depreciation Forecast

---

## 4. Quy trình nghiệp vụ

### 4.1 Depreciation Lifecycle

```
┌────────────────┐   Setup   ┌────────────┐   Run Monthly   ┌───────────┐
│ Asset Acquired │ ────────► │   ACTIVE   │ ──────────────► │ Entries   │
└────────────────┘           └────────────┘                 │ Created   │
                                   │                        └───────────┘
                                   │
                                   │ Last entry
                                   ▼
                            ┌──────────────────┐
                            │ FULLY_DEPRECIATED │
                            └──────────────────┘
```

### 4.2 Monthly Process

```
Ngày 1 mỗi tháng:
┌────────────────────────────────────────────────────────────┐
│ 1. System tính depreciation entries cho tháng trước       │
│ 2. Review entries (Asset Manager)                         │
│ 3. Post entries (confirm)                                 │
│ 4. Export cho Kế toán                                     │
│ 5. Kế toán hạch toán vào sổ sách                          │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Loại | Mô tả |
|----|---------|------|-------|
| DEP-R01 | One schedule per asset | Hard | Mỗi asset chỉ có 1 depreciation schedule active |
| DEP-R02 | Salvage ≤ Cost | Hard | Giá trị thanh lý ≤ Nguyên giá |
| DEP-R03 | Future start | Soft | Cảnh báo nếu start date trong quá khứ xa |
| DEP-R04 | No negative | Hard | Book value không được âm |
| DEP-R05 | Posted no edit | Hard | Entries đã post không được sửa |
| DEP-R06 | Sequential posting | Hard | Phải post theo thứ tự kỳ |
| DEP-R07 | Stop depreciation | Hard | Asset retired → stop depreciation |

---

## 6. Phân quyền chi tiết

| Hành động | Requester | Approver | Warehouse/IT | Asset Manager | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-----:|
| Xem depreciation | ✗ | ● | ● | ● | ● |
| Setup depreciation | ✗ | ✗ | ✗ | ● | ● |
| Run depreciation | ✗ | ✗ | ✗ | ● | ● |
| Post entries | ✗ | ✗ | ✗ | ● | ● |
| Adjust/Stop | ✗ | ✗ | ✗ | ● | ● |
| View reports | ✗ | ● | ● | ● | ● |
| Export reports | ✗ | ✗ | ● | ● | ● |

---

## 7. Thông báo & Cảnh báo

| Sự kiện | Kênh | Người nhận | Tần suất |
|---------|------|------------|----------|
| Cần chạy depreciation | Email, In-app | Asset Manager | Đầu tháng |
| Asset sắp hết khấu hao | In-app | Asset Manager | Khi còn 3 tháng |
| Asset đã hết khấu hao | Email | Asset Manager | 1 lần |
| Depreciation posted | In-app | Asset Manager | 1 lần |

---

## 8. Tiêu chí nghiệm thu

### AC-DEP-01: Setup depreciation

```gherkin
Given   Laptop LAP-001 có purchase price = 24,000,000 VND
When    Setup depreciation:
   - Method: Straight-line
   - Salvage: 0
   - Life: 3 years
   - Start: 01/01/2024
Then    Schedule được tạo
And     Monthly depreciation = 24,000,000 / 36 = 666,667 VND
And     End date = 31/12/2026
```

### AC-DEP-02: Run monthly depreciation

```gherkin
Given   Có 50 assets với depreciation active
When    Chạy depreciation cho 01/2024
Then    50 entries được tạo
And     Summary hiển thị tổng khấu hao
And     Entries ở trạng thái "Pending"
```

### AC-DEP-03: Post entries

```gherkin
Given   Depreciation entries 01/2024 đang Pending
When    Asset Manager review và Post
Then    Entries chuyển "Posted"
And     Accumulated depreciation tăng
And     Book value giảm
And     Không thể sửa entries này
```

### AC-DEP-04: Fully depreciated

```gherkin
Given   Asset có accumulated = cost - salvage
When    Chạy depreciation
Then    Không tạo entry mới
And     Status → "Fully Depreciated"
And     Notification gửi Asset Manager
```

### AC-DEP-05: Asset retired

```gherkin
Given   Asset đang có depreciation active
When    Asset được retire (disposal)
Then    Depreciation schedule → "Stopped"
And     Final entry tính đến ngày retire
And     Final book value được ghi nhận
```

### AC-DEP-06: Depreciation report

```gherkin
Given   Có dữ liệu depreciation
When    Generate Monthly Depreciation Report cho Q1/2024
Then    Report hiển thị:
   - Tổng khấu hao theo tháng
   - Breakdown theo category
   - List assets và số tiền
   - Export Excel/PDF available
```
