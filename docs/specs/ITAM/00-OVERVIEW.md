# ĐẶC TẢ CHỨC NĂNG HỆ THỐNG ITAM/INVENTORY/CMDB

## Thông tin tài liệu

| Thuộc tính | Giá trị |
|------------|---------|
| Phiên bản | 2.0 |
| Ngày tạo | 28/01/2026 |
| Trạng thái | Draft |
| Tác giả | Business Analysis Team |

---

## Mục lục tài liệu

| File | Nội dung |
|------|----------|
| [00-OVERVIEW.md](00-OVERVIEW.md) | Tổng quan, phạm vi, Actors & Quyền hạn |
| [01-LICENSES.md](01-LICENSES.md) | Module Quản lý Bản quyền |
| [02-ACCESSORIES.md](02-ACCESSORIES.md) | Module Quản lý Phụ kiện |
| [03-COMPONENTS.md](03-COMPONENTS.md) | Module Quản lý Linh kiện |
| [04-CONSUMABLES.md](04-CONSUMABLES.md) | Module Quản lý Vật tư tiêu hao |
| [05-CHECKOUT.md](05-CHECKOUT.md) | Module Cấp phát/Thu hồi Tài sản |
| [06-REQUESTS.md](06-REQUESTS.md) | Module Yêu cầu Self-service |
| [07-AUDIT.md](07-AUDIT.md) | Module Kiểm kê Tài sản |
| [08-LABELS.md](08-LABELS.md) | Module In nhãn QR/Barcode |
| [09-DEPRECIATION.md](09-DEPRECIATION.md) | Module Khấu hao |
| [10-REPORTS.md](10-REPORTS.md) | Module Báo cáo & Thông báo |
| [11-NFR.md](11-NFR.md) | Yêu cầu phi chức năng |
| [12-BACKLOG.md](12-BACKLOG.md) | Product Backlog |

---

# 1. TỔNG QUAN & PHẠM VI

## 1.1 Mục tiêu dự án

Nâng cấp hệ thống quản lý tài sản CNTT hiện tại để đạt **ITAM Core Parity** - tương đương các chức năng lõi của Snipe-IT và các hệ thống ITAM tiêu chuẩn ngành, bao gồm:

| Nhóm chức năng | Mô tả ngắn |
|----------------|------------|
| **Licenses** | Quản lý bản quyền phần mềm theo seat/device/user |
| **Accessories** | Quản lý phụ kiện cấp phát theo số lượng |
| **Components** | Quản lý linh kiện gắn vào/tháo ra khỏi tài sản |
| **Consumables** | Quản lý vật tư tiêu hao |
| **Check-out/Check-in** | Cấp phát và thu hồi tài sản có thời hạn |
| **Request Workflow** | Quy trình yêu cầu → duyệt → cấp phát |
| **Audit/Inventory** | Kiểm kê tài sản định kỳ |
| **Labels** | In nhãn QR/Barcode |
| **Depreciation** | Tính khấu hao và giá trị còn lại |
| **Reports & Alerts** | Báo cáo và thông báo tự động |

## 1.2 Phạm vi hệ thống

### Trong phạm vi (In Scope)

- Quản lý toàn bộ vòng đời tài sản IT (hardware, software, accessories, consumables)
- Hỗ trợ đa tổ chức (multi-organization), đa kho (multi-warehouse), đa site
- Quy trình workflow có trạng thái và phê duyệt
- Phân quyền chi tiết theo vai trò và phạm vi dữ liệu
- Tích hợp thông báo (email, in-app)
- Xuất báo cáo đa định dạng
- Audit trail đầy đủ

### Ngoài phạm vi (Out of Scope)

- Tích hợp hệ thống mua sắm (procurement) bên ngoài
- Quản lý hợp đồng chi tiết (contract management)
- Help desk / ticketing system
- Network discovery / auto-inventory

## 1.3 Nguyên tắc thiết kế nghiệp vụ

1. **Vòng đời chứng từ chuẩn**: Draft → Submitted → Approved → Fulfilled/Posted → Closed/Cancelled
2. **Audit trail bắt buộc**: Mọi thao tác quan trọng phải ghi nhận (ai, khi nào, giá trị trước/sau, lý do)
3. **Không âm tồn**: Mọi nghiệp vụ xuất/cấp phát không được làm âm số lượng khả dụng
4. **Phân quyền theo phạm vi**: Quyền hạn gắn với tổ chức/kho/site cụ thể
5. **Truy xuất nguồn gốc**: Mọi giao dịch phải liên kết được với chứng từ gốc

---

# 2. DANH SÁCH ACTOR & QUYỀN HẠN

## 2.1 Định nghĩa Actor

| Actor | Mô tả | Phạm vi hoạt động |
|-------|-------|-------------------|
| **Requester** | Nhân viên cuối yêu cầu tài sản/vật tư | Chỉ dữ liệu của bản thân và đơn vị mình |
| **Approver** | Quản lý phê duyệt yêu cầu | Yêu cầu thuộc đơn vị được phân công |
| **Warehouse/IT Staff** | Nhân viên kho/IT thực hiện cấp phát, kiểm kê | Kho/site được phân công |
| **Asset Manager** | Quản lý tài sản, license, báo cáo | Toàn bộ tài sản trong phạm vi tổ chức |
| **Finance** | Xem báo cáo tài chính, quản lý khấu hao | Dữ liệu tài chính, khấu hao |
| **Admin** | Quản trị hệ thống, cấu hình, phân quyền | Toàn bộ hệ thống |
| **Viewer** | Chỉ xem báo cáo được phân quyền | Báo cáo cụ thể |

## 2.2 Ma trận phân quyền tổng quát

| Chức năng | Requester | Approver | Warehouse/IT | Asset Manager | Finance | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-------:|:-----:|
| **Assets** |
| Xem danh sách | ○ | ● | ● | ● | ● | ● |
| Tạo mới | ✗ | ✗ | ● | ● | ✗ | ● |
| Cập nhật | ✗ | ✗ | ● | ● | ✗ | ● |
| Xóa/Retire | ✗ | ✗ | ✗ | ● | ✗ | ● |
| Check-out/in | ✗ | ✗ | ● | ● | ✗ | ● |
| **Licenses** |
| Xem | ○ | ● | ● | ● | ● | ● |
| Quản lý | ✗ | ✗ | ✗ | ● | ✗ | ● |
| Gán/Thu hồi seat | ✗ | ✗ | ● | ● | ✗ | ● |
| **Accessories/Components/Consumables** |
| Xem tồn kho | ✗ | ○ | ● | ● | ● | ● |
| Quản lý | ✗ | ✗ | ● | ● | ✗ | ● |
| Xuất/Cấp phát | ✗ | ✗ | ● | ● | ✗ | ● |
| **Requests** |
| Tạo yêu cầu | ● | ● | ● | ● | ● | ● |
| Duyệt/Từ chối | ✗ | ● | ✗ | ● | ✗ | ● |
| Fulfill | ✗ | ✗ | ● | ● | ✗ | ● |
| **Audit/Inventory** |
| Xem kết quả | ○ | ○ | ● | ● | ● | ● |
| Lập kế hoạch | ✗ | ✗ | ● | ● | ✗ | ● |
| Thực hiện scan | ✗ | ✗ | ● | ● | ✗ | ● |
| Đóng kiểm kê | ✗ | ✗ | ✗ | ● | ✗ | ● |
| **Labels** |
| In nhãn | ✗ | ✗ | ● | ● | ✗ | ● |
| Quản lý template | ✗ | ✗ | ✗ | ● | ✗ | ● |
| **Depreciation** |
| Xem báo cáo | ✗ | ✗ | ✗ | ● | ● | ● |
| Cấu hình/Chạy | ✗ | ✗ | ✗ | ✗ | ● | ● |
| **Reports** |
| Xem báo cáo | ○ | ● | ● | ● | ● | ● |
| Export | ✗ | ○ | ● | ● | ● | ● |

**Chú thích**: 
- ● = Có quyền đầy đủ 
- ○ = Có quyền hạn chế (theo phạm vi) 
- ✗ = Không có quyền

---

# 3. RÀNG BUỘC NGHIỆP VỤ CHUNG

## 3.1 Quy tắc dữ liệu

| Mã | Quy tắc | Loại |
|----|---------|------|
| GBR-01 | Mọi entity phải thuộc về một Organization | Hard |
| GBR-02 | Mã định danh (Asset Tag, SKU, Serial) phải unique trong Organization | Hard |
| GBR-03 | Không được xóa cứng dữ liệu đã có transaction, chỉ soft delete | Hard |
| GBR-04 | Số lượng tồn kho không được âm | Hard |
| GBR-05 | Mọi thay đổi trạng thái phải ghi audit log | Hard |

## 3.2 Quy tắc workflow

| Mã | Quy tắc | Loại |
|----|---------|------|
| GBR-10 | Chứng từ Draft có thể sửa/xóa tự do | - |
| GBR-11 | Chứng từ đã Submit không thể sửa, chỉ có thể Cancel (với quyền) | Hard |
| GBR-12 | Chứng từ đã Closed/Fulfilled không thể thay đổi | Hard |
| GBR-13 | Cancel phải có lý do | Soft |

## 3.3 Quy tắc thông báo

| Mã | Quy tắc | Loại |
|----|---------|------|
| GBR-20 | Thông báo phải có thể tắt theo preference của user | Soft |
| GBR-21 | Email thông báo phải có unsubscribe link | Should |
| GBR-22 | Thông báo quan trọng (security, overdue) không thể tắt | Hard |

---

# 4. THUẬT NGỮ

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| Asset | Tài sản IT (laptop, desktop, server, monitor...) |
| License | Bản quyền phần mềm |
| Accessory | Phụ kiện cấp phát theo số lượng (chuột, bàn phím, tai nghe...) |
| Component | Linh kiện gắn vào asset (RAM, SSD, CPU...) |
| Consumable | Vật tư tiêu hao (mực in, giấy...) |
| Checkout | Hành động cấp phát tài sản cho người dùng |
| Checkin | Hành động thu hồi tài sản về kho |
| Seat | Một đơn vị license (1 seat = 1 user/device được phép) |
| Reorder Point | Mức tồn kho tối thiểu, khi tồn ≤ mức này thì cần đặt hàng |
| UOM | Unit of Measure - Đơn vị tính |
| NBV | Net Book Value - Giá trị sổ sách còn lại |
| Depreciation | Khấu hao - giảm giá trị tài sản theo thời gian |
| Audit | Kiểm kê - đối chiếu tài sản thực tế với sổ sách |
| SLA | Service Level Agreement - Cam kết thời gian xử lý |

---

*Tiếp tục xem các module chi tiết trong các file tiếp theo.*
