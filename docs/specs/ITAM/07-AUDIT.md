# MODULE: AUDIT (Kiểm kê tài sản)

## 1. Mục tiêu nghiệp vụ

- Thực hiện kiểm kê tài sản định kỳ hoặc đột xuất
- So sánh tồn kho thực tế với dữ liệu hệ thống
- Phát hiện tài sản thất lạc, thừa, hoặc không đúng vị trí
- Tạo báo cáo chênh lệch và điều chỉnh

---

## 2. Đối tượng dữ liệu

### 2.1 Audit Session (Phiên kiểm kê)

| Trường | Mô tả | Bắt buộc | Ràng buộc |
|--------|-------|:--------:|-----------|
| Mã audit | Audit ID | ● | Auto: AUD-YYYYMMDD-XXX |
| Tên phiên | Audit name | ● | Tối đa 200 ký tự |
| Loại audit | full / partial / spot_check | ● | Enum |
| Phạm vi | Scope description | ● | Text |
| Location(s) | Locations được kiểm | ● | FK[] Location |
| Category(s) | Categories được kiểm | ○ | FK[] Category |
| Ngày bắt đầu | Start date | ● | Date |
| Ngày kết thúc | End date | ○ | Date |
| Người tạo | Created by | ● | FK User |
| Auditor(s) | Assigned auditors | ● | FK[] User |
| Trạng thái | Status | ● | draft / in_progress / reviewing / completed / cancelled |
| Ghi chú | Notes | ○ | Text |

### 2.2 Audit Item (Asset trong phiên kiểm)

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Audit Session | Thuộc phiên nào | ● |
| Asset | Asset được kiểm | ● |
| Expected Location | Vị trí theo hệ thống | ● |
| Expected User | User theo hệ thống | ○ |
| Audit Status | pending / found / missing / misplaced / unregistered | ● |
| Actual Location | Vị trí thực tế | ○ |
| Actual User | User thực tế giữ | ○ |
| Condition | Tình trạng | ○ |
| Audited by | Ai kiểm | ○ |
| Audited at | Thời điểm kiểm | ○ |
| Notes | Ghi chú | ○ |

### 2.3 Unregistered Asset (Tài sản chưa đăng ký)

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Audit Session | Thuộc phiên nào | ● |
| Temporary ID | Mã tạm | ● |
| Description | Mô tả | ● |
| Serial Number | S/N | ○ |
| Location Found | Nơi tìm thấy | ● |
| Condition | Tình trạng | ○ |
| Photo | Ảnh chụp | ○ |
| Action | register / investigate / dispose | ● |

---

## 3. Các màn hình/chức năng chính

### MH-AUD-01: Audit Dashboard

**Widgets**:
- Active audits in progress
- Upcoming scheduled audits
- Recent completed audits
- Discrepancy summary (last audit)

**Quick actions**:
- Create new audit
- View calendar

---

### MH-AUD-02: Audit List

**Cột hiển thị**:
- Mã audit
- Tên phiên
- Loại
- Phạm vi
- Ngày
- Progress (%)
- Trạng thái

**Bộ lọc**:
- Trạng thái
- Location
- Thời gian

---

### MH-AUD-03: Create Audit Session

**Workflow**:
```
Step 1: Thông tin cơ bản
   - Tên phiên kiểm kê
   - Loại (Full / Partial / Spot check)
   - Ngày bắt đầu - kết thúc
   
Step 2: Phạm vi
   - Chọn Location(s)
   - Chọn Category(s) (optional)
   - Hoặc chọn specific assets
   
Step 3: Phân công
   - Assign auditor(s)
   - Chia task theo location (optional)
   
Step 4: Review
   - Summary: X assets to audit
   - Preview list
   - Confirm
```

---

### MH-AUD-04: Audit Session Detail

**Tabs**:

**Overview**:
- Thông tin phiên
- Progress chart (pie: Found/Missing/Pending)
- Auditor assignments

**Asset List**:
- Danh sách assets cần kiểm
- Cột: Tag, Name, Expected Location, Status, Actual Location, Audited by
- Filter: Status, Location, Auditor
- Actions: Mark as Found, Mark as Missing, Mark as Misplaced

**Discrepancies**:
- Chỉ hiển thị items có vấn đề
- Missing, Misplaced, Condition issues

**Unregistered**:
- Assets tìm thấy nhưng chưa có trong hệ thống
- Actions: Register as new, Investigate, Mark for disposal

**History**:
- Timeline của phiên kiểm kê

---

### MH-AUD-05: Mobile Audit (Scan Mode)

**Mô tả**: Giao diện mobile-friendly cho việc scan kiểm kê

**Features**:
```
┌─────────────────────────────────────┐
│  📸 SCAN ASSET                      │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      [Camera viewfinder]    │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Or enter tag: [____________]       │
│                                     │
│  ─────────────────────────────────  │
│  Recent scans:                      │
│  ✓ LAP-001 - Found                  │
│  ✓ LAP-002 - Found                  │
│  ? MON-015 - Misplaced              │
│                                     │
│  Progress: 45/100 (45%)             │
└─────────────────────────────────────┘
```

**Scan flow**:
1. Scan barcode/QR
2. System lookup asset
3. If found in list:
   - Show expected vs current location
   - Mark as Found / Misplaced
   - Optional: Update condition
4. If not in list:
   - Option to add as unregistered
   - Take photo
   - Note description

---

### MH-AUD-06: Audit Review & Complete

**Pre-completion checks**:
- All items audited? (or explain)
- Discrepancies reviewed?
- Actions assigned for missing assets?

**Actions available**:
- Mark as Complete
- Generate report
- Create follow-up actions (for missing assets)
- Adjust records (for discrepancies)

---

## 4. Quy trình nghiệp vụ

### 4.1 Audit Workflow

```
┌───────┐  Assign   ┌─────────────┐  Start   ┌──────────────┐
│ DRAFT │ ────────► │ IN_PROGRESS │ ───────► │  AUDITING    │
└───────┘           └─────────────┘          └──────────────┘
                                                    │
                          ┌─────────────────────────┘
                          ▼
                    ┌───────────┐  Approve   ┌───────────┐
                    │ REVIEWING │ ─────────► │ COMPLETED │
                    └───────────┘            └───────────┘
```

### 4.2 Asset Audit Status

```
                     ┌───────────────────────────────────────┐
                     │           AUDIT ITEM STATUS           │
                     └───────────────────────────────────────┘

┌─────────┐                                            
│ PENDING │ ──── Scan/Check ────┬──────┬──────┬──────►[FOUND]
└─────────┘                     │      │      │
                                │      │      └──────►[MISSING]
                                │      │
                                │      └─────────────►[MISPLACED]
                                │                      (different location)
                                │
                                └────────────────────►[UNREGISTERED]
                                                      (not in system)
```

### 4.3 Discrepancy Resolution

| Loại | Action |
|------|--------|
| Found | Confirm location, update if needed |
| Missing | Investigate, mark lost/stolen, remove from inventory |
| Misplaced | Update location in system |
| Unregistered | Register as new asset hoặc investigate origin |
| Condition issue | Create maintenance ticket |

---

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Loại | Mô tả |
|----|---------|------|-------|
| AUD-R01 | No duplicate audit | Soft | Cảnh báo nếu location đã có audit in_progress |
| AUD-R02 | Auditor assignment | Hard | Mỗi audit phải có ít nhất 1 auditor |
| AUD-R03 | Complete check | Hard | Không complete nếu < 95% items audited (có thể override) |
| AUD-R04 | Discrepancy review | Soft | Cảnh báo nếu complete khi còn discrepancy chưa resolve |
| AUD-R05 | Audit trail | Hard | Mọi thay đổi audit item phải ghi log |
| AUD-R06 | Location lock | Soft | Cảnh báo checkout/transfer asset đang trong audit |

---

## 6. Phân quyền chi tiết

| Hành động | Requester | Approver | Warehouse/IT | Asset Manager | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-----:|
| Xem audits | ✗ | ✗ | ● | ● | ● |
| Tạo audit | ✗ | ✗ | ● | ● | ● |
| Perform audit (scan) | ✗ | ✗ | ● | ● | ● |
| Review discrepancies | ✗ | ✗ | ● | ● | ● |
| Complete audit | ✗ | ✗ | ✗ | ● | ● |
| Adjust inventory | ✗ | ✗ | ✗ | ● | ● |
| Delete audit | ✗ | ✗ | ✗ | ✗ | ● |

---

## 7. Thông báo & Cảnh báo

| Sự kiện | Kênh | Người nhận | Tần suất |
|---------|------|------------|----------|
| Audit assigned | Email, In-app | Auditors | 1 lần |
| Audit deadline approaching | Email | Auditors | 3 ngày trước |
| Audit overdue | Email | Auditors, Asset Manager | Hàng ngày |
| High discrepancy found | Email | Asset Manager | Ngay lập tức |
| Audit completed | Email | Asset Manager, Auditors | 1 lần |

---

## 8. Tiêu chí nghiệm thu

### AC-AUD-01: Tạo audit session

```gherkin
Given   Asset Manager đăng nhập
When    Tạo audit cho Location "Tầng 3" với category "Laptop"
Then    Audit session được tạo với status = draft
And     List items = all laptops at Tầng 3
And     Auditors được notify
```

### AC-AUD-02: Scan và mark Found

```gherkin
Given   Audit AUD-001 in progress
And     Laptop LAP-001 expected at "Tầng 3, Phòng A"
When    Auditor scan LAP-001 tại "Tầng 3, Phòng A"
Then    Item status → Found
And     Audit progress tăng
```

### AC-AUD-03: Mark Misplaced

```gherkin
Given   Laptop LAP-002 expected at "Tầng 3, Phòng A"
When    Auditor tìm thấy tại "Tầng 2, Phòng B"
Then    Item status → Misplaced
And     Actual location = "Tầng 2, Phòng B"
And     Item xuất hiện trong Discrepancies tab
```

### AC-AUD-04: Unregistered asset

```gherkin
Given   Audit in progress tại Tầng 3
When    Auditor scan barcode không có trong system
Then    Prompt "Asset không tìm thấy trong hệ thống"
And     Option: "Thêm vào danh sách Unregistered"
And     Auditor nhập mô tả, chụp ảnh
```

### AC-AUD-05: Complete audit

```gherkin
Given   Audit AUD-001 với 100 items
And     98 items đã audited
When    Asset Manager click Complete
Then    Cảnh báo "2 items chưa được kiểm"
And     Option: Continue anyway (với lý do)
And     Nếu confirm → Audit status = completed
```

### AC-AUD-06: Generate report

```gherkin
Given   Audit completed
When    Generate report
Then    Report bao gồm:
   - Summary: Total/Found/Missing/Misplaced
   - Detail by location
   - List of discrepancies
   - List of unregistered
   - Recommendations
```
