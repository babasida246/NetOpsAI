# MODULE: LABELS (In nhãn tài sản)

## 1. Mục tiêu nghiệp vụ

- Tạo và in nhãn (barcode/QR code) cho tài sản
- Hỗ trợ nhiều định dạng nhãn phổ biến
- In hàng loạt hoặc từng nhãn
- Tích hợp với máy in nhãn chuyên dụng

---

## 2. Đối tượng dữ liệu

### 2.1 Label Template (Mẫu nhãn)

| Trường | Mô tả | Bắt buộc | Ràng buộc |
|--------|-------|:--------:|-----------|
| Mã mẫu | Template ID | ● | Unique |
| Tên mẫu | Template name | ● | Tối đa 100 ký tự |
| Loại | barcode / qrcode / combined | ● | Enum |
| Kích thước | small / medium / large / custom | ● | Enum |
| Chiều rộng (mm) | Width | ● | Số dương |
| Chiều cao (mm) | Height | ● | Số dương |
| Layout | JSON layout definition | ● | JSON |
| Các trường hiển thị | Fields to include | ● | Array |
| Mặc định | Is default template | ○ | Boolean |
| Active | Is active | ● | Boolean |

### 2.2 Label Fields (Các trường có thể in)

| Field ID | Mô tả | Ví dụ |
|----------|-------|-------|
| asset_tag | Mã tài sản | LAP-001 |
| serial | Serial number | ABC123XYZ |
| name | Tên tài sản | Dell Latitude 5520 |
| company_name | Tên công ty | Công ty ABC |
| company_logo | Logo công ty | [Image] |
| barcode | Barcode image | [|||||||] |
| qrcode | QR code image | [QR] |
| purchase_date | Ngày mua | 2024-01-15 |
| category | Danh mục | Laptop |
| location | Vị trí | Tầng 3, Phòng A |
| assigned_to | Người sử dụng | Nguyễn Văn A |
| custom_field_X | Trường tùy chỉnh | ... |

### 2.3 Print Job (Lệnh in)

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Job ID | Mã lệnh in | ● |
| Template | Mẫu sử dụng | ● |
| Assets | Danh sách asset | ● |
| Số bản | Copies per asset | ● |
| Printer | Máy in | ○ |
| Created by | Người tạo | ● |
| Created at | Thời điểm | ● |
| Status | queued / printing / completed / failed | ● |

---

## 3. Các màn hình/chức năng chính

### MH-LBL-01: Label Templates

**Mô tả**: Quản lý các mẫu nhãn

**Danh sách templates**:
- Tên mẫu
- Loại (barcode/QR/combined)
- Kích thước
- Preview thumbnail
- Default/Active status

**Actions**:
- Xem/Sửa
- Clone
- Set as default
- Activate/Deactivate
- Delete

---

### MH-LBL-02: Template Designer

**Mô tả**: Giao diện thiết kế mẫu nhãn

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  TOOLBAR                                                │
│  [Save] [Preview] [Reset]                               │
├──────────────────────┬──────────────────────────────────┤
│   FIELD PALETTE      │         DESIGN CANVAS            │
│                      │                                  │
│   📝 Asset Tag       │   ┌────────────────────────┐     │
│   📝 Serial          │   │  [Logo]                │     │
│   📝 Name            │   │  ████████████████      │     │
│   🖼️ Logo            │   │  LAP-001               │     │
│   📊 Barcode         │   │  Dell Latitude 5520    │     │
│   📱 QR Code         │   └────────────────────────┘     │
│   📅 Purchase Date   │                                  │
│   ...                │   Label Size: 60mm x 30mm        │
│                      │                                  │
├──────────────────────┴──────────────────────────────────┤
│  PROPERTIES PANEL                                       │
│  Font: Arial  Size: 10pt  Bold: ☑  Position: X:5 Y:10  │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Drag & drop fields
- Resize elements
- Alignment tools
- Font/Size/Style options
- Preview với data thực

---

### MH-LBL-03: Print Labels

**Mô tả**: In nhãn cho assets

**Workflow**:
```
Step 1: Chọn Assets
   - Từ danh sách assets (checkbox)
   - Từ filter/search
   - Nhập danh sách tags
   - Từ file import
   
Step 2: Chọn Template
   - Hiển thị template gallery
   - Preview với asset data
   
Step 3: Print Settings
   - Số bản mỗi nhãn
   - Máy in (nếu có nhiều)
   - Paper/Label stock
   
Step 4: Preview & Print
   - Grid preview các nhãn
   - Print to PDF hoặc Direct print
```

---

### MH-LBL-04: Print History

**Mô tả**: Lịch sử các lệnh in

**Cột hiển thị**:
- Job ID
- Template used
- Số lượng nhãn
- Người in
- Thời gian
- Status

**Actions**:
- Reprint
- View details

---

## 4. Quy trình nghiệp vụ

### 4.1 Label Generation Flow

```
┌──────────────┐     ┌───────────────┐     ┌────────────┐
│ Select Assets│ ──► │ Choose Template│ ──► │ Configure  │
└──────────────┘     └───────────────┘     └────────────┘
                                                  │
         ┌────────────────────────────────────────┘
         ▼
   ┌───────────┐     ┌─────────────┐     ┌───────────┐
   │  Preview  │ ──► │ Print/Export │ ──► │ Complete  │
   └───────────┘     └─────────────┘     └───────────┘
```

### 4.2 Barcode Types Support

| Loại | Use case | Ví dụ |
|------|----------|-------|
| Code128 | General purpose | LAP-001 |
| Code39 | Alphanumeric | SN12345 |
| QR Code | Mobile scanning, nhiều data | URL + Asset info |
| DataMatrix | Small size, industrial | Manufacturing |
| EAN-13 | Retail products | Product SKU |

---

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Loại | Mô tả |
|----|---------|------|-------|
| LBL-R01 | Unique tag | Hard | Asset tag phải unique để barcode có ý nghĩa |
| LBL-R02 | Template required | Hard | Phải có ít nhất 1 template active |
| LBL-R03 | Valid size | Hard | Kích thước nhãn phải > 0 |
| LBL-R04 | Field validation | Soft | Cảnh báo nếu asset thiếu fields được chọn |
| LBL-R05 | Print log | Hard | Mọi lệnh in phải được ghi log |

---

## 6. Phân quyền chi tiết

| Hành động | Requester | Approver | Warehouse/IT | Asset Manager | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-----:|
| Xem templates | ✗ | ● | ● | ● | ● |
| Tạo template | ✗ | ✗ | ✗ | ● | ● |
| Sửa template | ✗ | ✗ | ✗ | ● | ● |
| Xóa template | ✗ | ✗ | ✗ | ✗ | ● |
| In nhãn | ✗ | ✗ | ● | ● | ● |
| Xem print history | ✗ | ✗ | ● | ● | ● |

---

## 7. Thông báo & Cảnh báo

| Sự kiện | Kênh | Người nhận | Tần suất |
|---------|------|------------|----------|
| Print job failed | In-app | User thực hiện | Ngay lập tức |
| Large print job | In-app | Asset Manager | Khi > 100 nhãn |

---

## 8. Tiêu chí nghiệm thu

### AC-LBL-01: Tạo template

```gherkin
Given   Asset Manager đăng nhập
When    Tạo template với:
   - Name: "Standard Label"
   - Size: 60mm x 30mm
   - Fields: Logo, Barcode, Asset Tag, Name
Then    Template được lưu
And     Preview hiển thị đúng layout
```

### AC-LBL-02: In nhãn single

```gherkin
Given   Asset LAP-001 tồn tại
When    Chọn asset và in 1 nhãn
Then    Preview hiển thị đúng data
And     PDF/Print output chính xác
And     Print job logged
```

### AC-LBL-03: In nhãn hàng loạt

```gherkin
Given   50 assets được chọn
When    In với 2 copies mỗi asset
Then    100 nhãn được generate
And     Preview grid hiển thị
And     Export/Print thành công
```

### AC-LBL-04: Missing field warning

```gherkin
Given   Template include "Serial Number" field
And     Asset LAP-001 không có serial number
When    Preview nhãn cho LAP-001
Then    Cảnh báo "Serial Number is empty"
And     Vẫn cho phép in (với giá trị trống)
```

### AC-LBL-05: QR Code với URL

```gherkin
Given   Template có QR Code field
And     System setting "QR contains URL" = true
When    Generate nhãn cho LAP-001
Then    QR code encode URL: https://itam.company.com/assets/LAP-001
And     Scan QR → mở trang asset detail
```
