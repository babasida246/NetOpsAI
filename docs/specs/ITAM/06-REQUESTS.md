# MODULE: REQUESTS (Yêu cầu tài sản)

## 1. Mục tiêu nghiệp vụ

- Cho phép nhân viên tự yêu cầu tài sản IT qua hệ thống
- Thiết lập quy trình phê duyệt nhiều cấp
- Tự động thông báo và escalate khi cần
- Theo dõi trạng thái yêu cầu từ submit đến fulfill

---

## 2. Đối tượng dữ liệu

### 2.1 Asset Request

| Trường | Mô tả | Bắt buộc | Ràng buộc |
|--------|-------|:--------:|-----------|
| Mã yêu cầu | Request ID | ● | Auto-generate: REQ-YYYYMMDD-XXXX |
| Loại yêu cầu | new / replacement / upgrade / return | ● | Enum |
| Người yêu cầu | Requester | ● | FK User (auto = current user) |
| Phòng ban | Department | ● | FK Department |
| Asset Category | Loại tài sản cần | ● | FK Category |
| Model cụ thể | Specific model (optional) | ○ | FK Model |
| Số lượng | Quantity | ● | ≥ 1 |
| Lý do | Business justification | ● | Text, min 20 chars |
| Độ ưu tiên | low / normal / high / urgent | ● | Enum |
| Ngày cần | Required date | ○ | Date >= today |
| Tài liệu đính kèm | Attachments | ○ | Files |
| Asset thay thế | Nếu replacement | ○ | FK Asset |
| Trạng thái | Status | ● | Enum (see workflow) |
| Ngày tạo | Created at | ● | DateTime |
| Ngày cập nhật | Updated at | ● | DateTime |

### 2.2 Approval Step

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Request | Thuộc request nào | ● |
| Thứ tự | Step order | ● |
| Approver | Người phê duyệt | ● |
| Trạng thái | pending / approved / rejected | ● |
| Ngày quyết định | Decision date | ○ |
| Ghi chú | Comments | ○ |

---

## 3. Các màn hình/chức năng chính

### MH-REQ-01: My Requests (Requester view)

**Mô tả**: Nhân viên xem các yêu cầu của mình

**Tabs**:
- Tất cả
- Đang chờ duyệt
- Đã duyệt
- Đã hoàn thành
- Bị từ chối

**Cột hiển thị**:
- Mã yêu cầu
- Loại
- Tài sản yêu cầu
- Ngày tạo
- Trạng thái (với progress bar)

**Actions**:
- Xem chi tiết
- Hủy (nếu còn pending)
- Tạo mới

---

### MH-REQ-02: Approval Queue (Approver view)

**Mô tả**: Danh sách yêu cầu đang chờ phê duyệt

**Cột hiển thị**:
- Mã yêu cầu
- Người yêu cầu
- Phòng ban
- Loại tài sản
- Độ ưu tiên
- Ngày yêu cầu
- Ngày cần
- Đang chờ (X ngày)

**Bộ lọc**:
- Độ ưu tiên
- Phòng ban
- Loại tài sản

**Actions**:
- Xem chi tiết
- Approve
- Reject
- Request more info

---

### MH-REQ-03: Create Request

**Workflow**:
```
Step 1: Chọn loại yêu cầu
   ┌─────────────────────────────────────────────────────┐
   │  ○ New Asset (Cấp mới)                              │
   │  ○ Replacement (Thay thế)                           │
   │  ○ Upgrade (Nâng cấp)                               │
   │  ○ Return (Trả lại)                                 │
   └─────────────────────────────────────────────────────┘

Step 2: Chi tiết yêu cầu
   - Danh mục tài sản (dropdown)
   - Model cụ thể (optional, autocomplete)
   - Số lượng
   - Ngày cần (datepicker)
   - Độ ưu tiên
   
Step 3: Lý do
   - Textarea nhập business justification
   - Đính kèm file (optional)
   
Step 4: Review & Submit
   - Hiển thị summary
   - Hiển thị approval flow preview
   - Checkbox xác nhận
   - Submit
```

**Validation**:
- Lý do >= 20 ký tự
- Ngày cần >= today
- Nếu replacement: chọn asset hiện tại

---

### MH-REQ-04: Request Detail

**Sections**:

**Header**:
- Mã yêu cầu
- Status badge
- Priority badge
- Created date

**Thông tin yêu cầu**:
- Loại, Category, Model
- Số lượng
- Ngày cần
- Lý do
- Attachments

**Approval Flow** (visual timeline):
```
[✓] Manager Approved (2024-01-15)
    → "Approved for team needs"
    
[⏳] Department Head (Pending)
    → Waiting since 2 days
    
[ ] IT Department (Upcoming)

[ ] Fulfillment (Upcoming)
```

**Actions** (based on role & status):
- Approve / Reject (for current approver)
- Cancel (for requester if pending)
- Fulfill (for Warehouse if approved)

---

### MH-REQ-05: Fulfill Request

**Mô tả**: Form hoàn thành yêu cầu đã được duyệt

**Workflow**:
```
1. Xem request details
2. Chọn asset(s) để fulfill:
   - Tìm asset available matching category
   - Hoặc tạo mới nếu chưa có
3. Confirm fulfillment
4. Trigger checkout process
```

---

## 4. Quy trình nghiệp vụ

### 4.1 Request Workflow

```
┌──────────┐  Submit   ┌───────────────┐
│  DRAFT   │ ────────► │ PENDING_APPROVAL│
└──────────┘           └───────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐        ┌───────────┐        ┌──────────┐
    │ REJECTED│        │NEED_INFO │◄──────►│ APPROVED │
    └─────────┘        └───────────┘        └──────────┘
                                                   │
                                                   ▼
                                            ┌────────────┐
                                            │ FULFILLING │
                                            └────────────┘
                                                   │
                                                   ▼
                                            ┌────────────┐
                                            │ COMPLETED  │
                                            └────────────┘
```

### 4.2 Approval Chain Configuration

**Cấu hình theo**:
- Asset value (< 10M: Manager, >= 10M: Manager + Director)
- Asset category (Laptop: IT + Manager, Furniture: Admin + Manager)
- Department

**Ví dụ chain**:
```
1. Direct Manager (auto-assign based on requester)
2. Department Head (based on department)
3. IT Department (if IT asset)
4. Finance (if value > threshold)
```

### 4.3 Escalation Rules

| Thời gian chờ | Action |
|---------------|--------|
| 2 ngày | Reminder email cho approver |
| 5 ngày | Escalate lên manager của approver |
| 7 ngày | Notify IT Manager + requester |

---

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Loại | Mô tả |
|----|---------|------|-------|
| REQ-R01 | Self-request | Hard | Chỉ tạo request cho chính mình (trừ Managers) |
| REQ-R02 | Justification required | Hard | Phải có lý do ≥ 20 ký tự |
| REQ-R03 | Sequential approval | Hard | Phải duyệt theo thứ tự chain |
| REQ-R04 | No self-approve | Hard | Không tự approve request của mình |
| REQ-R05 | Reject ends flow | Hard | Reject ở bất kỳ step → request rejected |
| REQ-R06 | One pending | Soft | Cảnh báo nếu có request tương tự đang pending |
| REQ-R07 | Cancel before approval | Hard | Chỉ cancel khi chưa có ai approve |
| REQ-R08 | Replacement needs asset | Hard | Replacement request phải chọn asset hiện tại |

---

## 6. Phân quyền chi tiết

| Hành động | Requester | Approver | Warehouse/IT | Asset Manager | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-----:|
| Xem request của mình | ● | ● | ● | ● | ● |
| Xem tất cả requests | ✗ | ○¹ | ● | ● | ● |
| Tạo request | ● | ● | ● | ● | ● |
| Tạo request cho người khác | ✗ | ● | ✗ | ● | ● |
| Cancel request của mình | ● | ● | ● | ● | ● |
| Approve/Reject | ✗ | ●² | ✗ | ● | ● |
| Fulfill request | ✗ | ✗ | ● | ● | ● |
| Configure approval chain | ✗ | ✗ | ✗ | ✗ | ● |
| View reports | ✗ | ○¹ | ● | ● | ● |

> ¹ Chỉ xem requests trong scope (department, team)
> ² Chỉ approve requests được assign

---

## 7. Thông báo & Cảnh báo

| Sự kiện | Kênh | Người nhận | Tần suất |
|---------|------|------------|----------|
| Request submitted | Email, In-app | Requester, First approver | 1 lần |
| Pending approval | In-app | Current approver | 1 lần |
| Approval reminder | Email, In-app | Current approver | Sau 2 ngày |
| Request approved (step) | In-app | Requester | Mỗi step |
| Request fully approved | Email, In-app | Requester, Warehouse | 1 lần |
| Request rejected | Email, In-app | Requester | 1 lần |
| Request fulfilled | Email, In-app | Requester | 1 lần |
| Need more info | Email, In-app | Requester | 1 lần |

---

## 8. Nhật ký (Audit Trail)

| Sự kiện | Thông tin ghi nhận |
|---------|-------------------|
| Create request | Ai tạo, nội dung request |
| Submit request | Ngày submit |
| Approve step | Ai approve, step nào, comments |
| Reject | Ai reject, lý do |
| Request more info | Ai yêu cầu, câu hỏi |
| Provide info | Thông tin bổ sung |
| Cancel | Ai cancel, lý do |
| Fulfill | Ai fulfill, asset(s) used |

---

## 9. Tiêu chí nghiệm thu

### AC-REQ-01: Tạo request

```gherkin
Given   User A đã đăng nhập
When    Tạo request "New Laptop" với lý do đầy đủ
Then    Request được tạo với status = pending_approval
And     First approver (Manager) nhận notification
And     Audit log ghi nhận
```

### AC-REQ-02: Approval flow

```gherkin
Given   Request REQ-001 pending approval từ Manager
When    Manager approve với comment "Approved"
Then    Request chuyển sang step tiếp theo
And     Next approver nhận notification
And     Requester nhận in-app notification "Đã được Manager duyệt"
```

### AC-REQ-03: Reject request

```gherkin
Given   Request REQ-001 pending approval
When    Approver reject với lý do "Budget không đủ"
Then    Request status → rejected
And     Flow kết thúc
And     Requester nhận email "Request bị từ chối vì: Budget không đủ"
```

### AC-REQ-04: Fulfill request

```gherkin
Given   Request REQ-001 fully approved
And     Laptop #LAP-005 available matching category
When    Warehouse fulfill với Laptop #LAP-005
Then    Request status → completed
And     Laptop checkout cho requester
And     Requester nhận email "Request hoàn thành, Laptop #LAP-005 đã cấp"
```

### AC-REQ-05: Escalation

```gherkin
Given   Request pending approval từ Manager trong 3 ngày
When    Scheduled job chạy
Then    Reminder email gửi cho Manager
And     Audit log ghi nhận reminder
```

### AC-REQ-06: Cancel request

```gherkin
Given   Request REQ-001 pending (chưa ai approve)
When    Requester cancel với lý do "Không cần nữa"
Then    Request status → cancelled
And     Approvers nhận notification "Request đã bị hủy"

Given   Request REQ-002 có 1 step đã approved
When    Requester cố cancel
Then    Hệ thống từ chối "Không thể hủy request đã được duyệt một phần"
```

### AC-REQ-07: Request more info

```gherkin
Given   Request REQ-001 pending approval từ Manager
When    Manager click "Request More Info" với câu hỏi
Then    Request status → need_info
And     Requester nhận email với câu hỏi
And     Requester có thể reply trong hệ thống
And     Reply → status trở về pending_approval
```
