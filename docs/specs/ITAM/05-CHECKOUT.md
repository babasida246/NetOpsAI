# MODULE: CHECKOUT (Xuất/Nhận tài sản)

## 1. Mục tiêu nghiệp vụ

- Quản lý việc cấp phát (checkout) và thu hồi (checkin) tài sản
- Theo dõi ai đang giữ tài sản nào
- Quản lý ngày dự kiến trả và cảnh báo quá hạn
- Hỗ trợ chuyển giao tài sản giữa các user

---

## 2. Đối tượng dữ liệu

### 2.1 Asset Checkout Record

| Trường | Mô tả | Bắt buộc | Ràng buộc |
|--------|-------|:--------:|-----------|
| Mã checkout | Mã phiên | ● | Auto-generate |
| Asset | Tài sản checkout | ● | FK Asset, status = available |
| Loại checkout | user / location / asset | ● | Enum |
| Target User | Nếu checkout cho user | ○ | FK User |
| Target Location | Nếu checkout cho location | ○ | FK Location |
| Target Asset | Nếu checkout cho asset (laptop → dock) | ○ | FK Asset |
| Ngày checkout | Checkout date | ● | DateTime |
| Ngày dự kiến trả | Expected checkin | ○ | Date |
| Người thực hiện | Checked out by | ● | FK User |
| Ghi chú checkout | Notes | ○ | Text |
| Trạng thái | checked_out / checked_in | ● | Enum |
| Ngày checkin | Actual checkin date | ○ | DateTime |
| Người checkin | Checked in by | ○ | FK User |
| Ghi chú checkin | Checkin notes | ○ | Text |

---

## 3. Các màn hình/chức năng chính

### MH-CHK-01: Dashboard Checkout

**Mô tả**: Tổng quan tình trạng checkout

**Widgets**:
- Tổng số asset đang checkout
- Số lượng quá hạn (overdue)
- Upcoming returns (7 ngày tới)
- Recent activity

**Quick actions**:
- Checkout mới
- Checkin nhanh (scan barcode)

---

### MH-CHK-02: Danh sách Checkout đang active

**Các cột**:
- Mã checkout
- Asset (tag + name)
- Checkout cho (User/Location)
- Ngày checkout
- Ngày dự kiến trả
- Người thực hiện
- Status (với màu)

**Status colors**:
- 🟢 On track: còn thời gian
- 🟡 Due soon: trong 3 ngày
- 🔴 Overdue: quá hạn

**Bộ lọc**:
- Loại checkout
- Trạng thái (all / overdue / due soon)
- Asset category
- User/Location

**Actions**:
- Xem chi tiết
- Checkin
- Extend

---

### MH-CHK-03: Checkout Asset

**Mô tả**: Form checkout asset cho user/location

**Workflow**:
```
1. Tìm kiếm Asset (by tag, serial, name)
   - Scan barcode hoặc nhập tay
   - Chỉ hiển thị assets available
   
2. Chọn loại checkout:
   - User: Tìm chọn user
   - Location: Chọn location
   - Asset: Tìm asset khác (vd: docking station)
   
3. Nhập ngày dự kiến trả (optional)
   - Có preset: 7 days, 30 days, 1 year, indefinite
   
4. Ghi chú (optional)

5. Xác nhận:
   - Hiển thị summary
   - Checkbox xác nhận đã bàn giao
   
6. Submit
```

**Validation**:
- Asset phải available
- User phải active
- Expected checkin >= today

**Post-checkout**:
- Asset status → deployed
- Email notification cho user nhận
- Audit log

---

### MH-CHK-04: Checkin Asset

**Mô tả**: Form thu hồi asset

**Workflow**:
```
1. Tìm checkout record:
   - Scan asset barcode
   - Tìm theo user
   - Chọn từ danh sách active checkouts
   
2. Kiểm tra tình trạng:
   - Checkbox: Tình trạng tốt
   - Nếu có vấn đề: Nhập chi tiết
   
3. Chọn next action:
   - Ready to deploy (→ available)
   - Need maintenance (→ pending maintenance)
   - Retire (→ retired)
   
4. Ghi chú (optional)

5. Xác nhận
```

**Post-checkin**:
- Checkout record đánh dấu checked_in
- Asset status update theo next action
- Email confirmation
- Audit log

---

### MH-CHK-05: Extend Checkout

**Mô tả**: Gia hạn ngày dự kiến trả

**Workflow**:
```
1. Chọn checkout record
2. Nhập ngày mới (phải > ngày cũ)
3. Lý do gia hạn
4. Xác nhận
```

---

### MH-CHK-06: Transfer Asset

**Mô tả**: Chuyển asset từ user A sang user B

**Workflow**:
```
1. Chọn asset đang checkout cho User A
2. Chọn User B (người nhận mới)
3. Nhập ngày dự kiến trả mới (optional)
4. Ghi chú
5. Xác nhận
```

**Kết quả**:
- Checkin cho User A (auto)
- Checkout cho User B
- Email cho cả 2 user
- Audit log

---

## 4. Quy trình nghiệp vụ

### 4.1 Checkout/Checkin Lifecycle

```
           ┌─────────────────────────────────────────────────────┐
           │                    ASSET LIFECYCLE                   │
           └─────────────────────────────────────────────────────┘

┌───────────┐   Checkout   ┌──────────┐   Checkin    ┌───────────┐
│ AVAILABLE │ ───────────► │ DEPLOYED │ ───────────► │ AVAILABLE │
└───────────┘              └──────────┘              └───────────┘
                                │                          │
                                │                          │ Checkout again
                                │ Transfer                 │
                                ▼                          │
                          ┌──────────┐                     │
                          │ DEPLOYED │◄────────────────────┘
                          │ (new user)│
                          └──────────┘
```

### 4.2 Overdue Handling

```
Day 0: Checkout với expected_return = Day 14

Day 11: Email reminder "3 ngày nữa đến hạn trả"

Day 14: Email "Hôm nay là hạn trả"
        Status → overdue

Day 15+: Email daily reminder
         Badge → overdue (đỏ)
         Escalate to manager

Day 30: Escalate to Asset Manager
```

---

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Loại | Mô tả |
|----|---------|------|-------|
| CHK-R01 | Only available | Hard | Chỉ checkout asset có status = available |
| CHK-R02 | Active user | Hard | Chỉ checkout cho user đang active |
| CHK-R03 | Future return | Soft | Expected return >= today (cảnh báo nếu không) |
| CHK-R04 | One checkout | Hard | Một asset chỉ có 1 active checkout |
| CHK-R05 | Must checkin first | Hard | Phải checkin trước khi checkout lại |
| CHK-R06 | Overdue alert | Auto | Quá hạn → gửi reminder hàng ngày |
| CHK-R07 | Transfer = CI + CO | Hard | Transfer = Checkin từ A + Checkout cho B |

---

## 6. Phân quyền chi tiết

| Hành động | Requester | Approver | Warehouse/IT | Asset Manager | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-----:|
| Xem dashboard | ○¹ | ● | ● | ● | ● |
| Xem active checkouts | ○¹ | ● | ● | ● | ● |
| Checkout | ✗ | ✗ | ● | ● | ● |
| Checkin | ✗ | ✗ | ● | ● | ● |
| Extend | ✗ | ✗ | ● | ● | ● |
| Transfer | ✗ | ✗ | ● | ● | ● |
| Override overdue | ✗ | ✗ | ✗ | ● | ● |
| Export | ✗ | ● | ● | ● | ● |

> ¹ Chỉ xem checkout của mình

---

## 7. Thông báo & Cảnh báo

| Sự kiện | Kênh | Người nhận | Tần suất |
|---------|------|------------|----------|
| Asset checked out cho bạn | Email, In-app | User nhận | 1 lần |
| Asset checked in từ bạn | Email, In-app | User giao | 1 lần |
| 3 ngày trước deadline | Email, In-app | User đang giữ | 1 lần |
| Đến hạn trả | Email, In-app | User đang giữ | 1 lần |
| Quá hạn | Email, In-app | User, Manager | Hàng ngày |
| Quá hạn 7 ngày | Email | Asset Manager | 1 lần |
| Transfer | Email | User cũ, User mới | 1 lần |

---

## 8. Nhật ký (Audit Trail)

| Sự kiện | Thông tin ghi nhận |
|---------|-------------------|
| Checkout | Asset, cho ai, ai thực hiện, expected return |
| Checkin | Asset, từ ai, ai thực hiện, tình trạng |
| Extend | Asset, ngày cũ, ngày mới, lý do |
| Transfer | Asset, từ user, đến user, ai thực hiện |
| Overdue reminder | Asset, user, ngày gửi |

---

## 9. Tiêu chí nghiệm thu

### AC-CHK-01: Checkout Asset

```gherkin
Given   Laptop #LAP-001 có status = available
When    Warehouse checkout cho User A với expected return = 30 ngày
Then    Checkout record được tạo
And     Laptop status → deployed
And     User A nhận email "Bạn vừa được cấp Laptop #LAP-001"
And     Audit log ghi nhận
```

### AC-CHK-02: Ngăn checkout asset đã deployed

```gherkin
Given   Laptop #LAP-001 đang deployed cho User A
When    Cố checkout Laptop #LAP-001 cho User B
Then    Hệ thống từ chối "Asset đang được sử dụng"
And     Gợi ý "Transfer từ User A?"
```

### AC-CHK-03: Checkin Asset

```gherkin
Given   User A đang giữ Laptop #LAP-001
When    Warehouse checkin với tình trạng = tốt, next = available
Then    Checkout record → checked_in
And     Laptop status → available
And     User A nhận email xác nhận
```

### AC-CHK-04: Checkin cần bảo trì

```gherkin
Given   User A đang giữ Laptop #LAP-001
When    Warehouse checkin với tình trạng = có vấn đề, next = maintenance
Then    Laptop status → pending maintenance
And     Maintenance ticket được tạo (nếu integrated)
```

### AC-CHK-05: Overdue reminder

```gherkin
Given   User A có checkout với expected return = yesterday
When    Scheduled job chạy
Then    User A nhận email "Asset quá hạn, vui lòng trả"
And     Checkout badge → overdue (đỏ)
```

### AC-CHK-06: Transfer Asset

```gherkin
Given   Laptop #LAP-001 đang checkout cho User A
When    Warehouse transfer sang User B
Then    Checkin record cho User A được tạo
And     Checkout record mới cho User B được tạo
And     User A nhận "Laptop đã được thu hồi"
And     User B nhận "Bạn vừa được cấp Laptop"
```

### AC-CHK-07: Extend checkout

```gherkin
Given   Checkout có expected return = ngày mai
When    Warehouse extend thêm 7 ngày
Then    Expected return = ngày mai + 7
And     Audit log ghi nhận việc extend với lý do
```
