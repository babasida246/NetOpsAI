# PRODUCT BACKLOG (Backlog sản phẩm)

## Tổng quan

Document này chứa danh sách các Epic, Feature và User Story cho hệ thống ITAM/CMDB. Backlog được tổ chức theo priority và sprint planning.

---

## Epic Overview

| Epic ID | Tên | Mô tả | Priority |
|---------|-----|-------|----------|
| E01 | Core Asset Management | Quản lý tài sản cơ bản | P0 - Critical |
| E02 | Checkout/Checkin | Xuất/nhận tài sản | P0 - Critical |
| E03 | License Management | Quản lý bản quyền | P1 - High |
| E04 | Inventory Management | Phụ kiện, linh kiện, vật tư | P1 - High |
| E05 | Request Workflow | Quy trình yêu cầu | P1 - High |
| E06 | Audit & Compliance | Kiểm kê, tuân thủ | P2 - Medium |
| E07 | Reporting & Analytics | Báo cáo, phân tích | P2 - Medium |
| E08 | Financial Management | Khấu hao, chi phí | P2 - Medium |
| E09 | Integration | Tích hợp bên ngoài | P3 - Low |
| E10 | Advanced Features | Tính năng nâng cao | P3 - Low |

---

## E01: Core Asset Management

### F01.1: Asset CRUD

**Priority**: P0  
**Sprint**: 1-2

| Story ID | User Story | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| US-001 | Với tư cách Asset Manager, tôi muốn tạo mới tài sản để thêm vào hệ thống | 5 | Xem AC-AST-01 |
| US-002 | Với tư cách Asset Manager, tôi muốn xem danh sách tài sản với filter và sort | 5 | Filter by status, category, location; Sort by any column |
| US-003 | Với tư cách Asset Manager, tôi muốn xem chi tiết tài sản với tất cả thông tin | 3 | Hiển thị đầy đủ fields, tabs related data |
| US-004 | Với tư cách Asset Manager, tôi muốn sửa thông tin tài sản | 3 | Validate, audit log |
| US-005 | Với tư cách Asset Manager, tôi muốn xóa/retire tài sản | 3 | Soft delete, require reason |
| US-006 | Với tư cách User, tôi muốn xem tài sản được gán cho mình | 2 | Filtered view, limited fields |

### F01.2: Asset Categories & Types

**Priority**: P0  
**Sprint**: 1

| Story ID | User Story | Points |
|----------|------------|--------|
| US-007 | Với tư cách Admin, tôi muốn quản lý danh mục tài sản | 3 |
| US-008 | Với tư cách Admin, tôi muốn định nghĩa custom fields cho từng category | 5 |
| US-009 | Với tư cách Asset Manager, tôi muốn import categories từ Excel | 3 |

### F01.3: Manufacturers & Models

**Priority**: P1  
**Sprint**: 2

| Story ID | User Story | Points |
|----------|------------|--------|
| US-010 | Với tư cách Asset Manager, tôi muốn quản lý danh sách Manufacturers | 2 |
| US-011 | Với tư cách Asset Manager, tôi muốn quản lý Asset Models | 3 |
| US-012 | Với tư cách Asset Manager, tôi muốn link model với default depreciation settings | 2 |

### F01.4: Locations

**Priority**: P0  
**Sprint**: 1

| Story ID | User Story | Points |
|----------|------------|--------|
| US-013 | Với tư cách Admin, tôi muốn quản lý hierarchical locations | 5 |
| US-014 | Với tư cách Asset Manager, tôi muốn xem assets theo location tree | 3 |

### F01.5: Bulk Operations

**Priority**: P1  
**Sprint**: 3

| Story ID | User Story | Points |
|----------|------------|--------|
| US-015 | Với tư cách Asset Manager, tôi muốn import assets từ Excel | 8 |
| US-016 | Với tư cách Asset Manager, tôi muốn export assets ra Excel/CSV | 5 |
| US-017 | Với tư cách Asset Manager, tôi muốn bulk update nhiều assets | 5 |
| US-018 | Với tư cách Asset Manager, tôi muốn bulk delete/retire assets | 3 |

---

## E02: Checkout/Checkin

### F02.1: Checkout Flow

**Priority**: P0  
**Sprint**: 3

| Story ID | User Story | Points |
|----------|------------|--------|
| US-019 | Với tư cách Warehouse, tôi muốn checkout asset cho user | 5 |
| US-020 | Với tư cách Warehouse, tôi muốn scan barcode để checkout nhanh | 5 |
| US-021 | Với tư cách Warehouse, tôi muốn checkout cho location thay vì user | 3 |
| US-022 | Với tư cách User, tôi muốn nhận notification khi được gán asset | 2 |

### F02.2: Checkin Flow

**Priority**: P0  
**Sprint**: 3

| Story ID | User Story | Points |
|----------|------------|--------|
| US-023 | Với tư cách Warehouse, tôi muốn checkin asset từ user | 5 |
| US-024 | Với tư cách Warehouse, tôi muốn ghi nhận tình trạng khi checkin | 3 |
| US-025 | Với tư cách Warehouse, tôi muốn chuyển asset sang maintenance nếu cần | 2 |

### F02.3: Transfer & Extend

**Priority**: P1  
**Sprint**: 4

| Story ID | User Story | Points |
|----------|------------|--------|
| US-026 | Với tư cách Warehouse, tôi muốn transfer asset từ user A sang user B | 5 |
| US-027 | Với tư cách Warehouse, tôi muốn extend thời hạn checkout | 2 |
| US-028 | Với tư cách Manager, tôi muốn xem checkout history của team | 3 |

### F02.4: Overdue Management

**Priority**: P1  
**Sprint**: 4

| Story ID | User Story | Points |
|----------|------------|--------|
| US-029 | Với tư cách System, tôi muốn tự động gửi reminder trước deadline | 3 |
| US-030 | Với tư cách System, tôi muốn escalate khi quá hạn | 3 |
| US-031 | Với tư cách Asset Manager, tôi muốn xem dashboard overdue | 3 |

---

## E03: License Management

### F03.1: License CRUD

**Priority**: P1  
**Sprint**: 5

| Story ID | User Story | Points |
|----------|------------|--------|
| US-032 | Với tư cách Asset Manager, tôi muốn tạo/quản lý licenses | 5 |
| US-033 | Với tư cách Asset Manager, tôi muốn track seats usage | 3 |
| US-034 | Với tư cách Asset Manager, tôi muốn lưu product keys encrypted | 3 |

### F03.2: Seat Assignment

**Priority**: P1  
**Sprint**: 5

| Story ID | User Story | Points |
|----------|------------|--------|
| US-035 | Với tư cách IT, tôi muốn gán license seat cho user | 3 |
| US-036 | Với tư cách IT, tôi muốn thu hồi license seat | 2 |
| US-037 | Với tư cách User, tôi muốn xem licenses được gán cho mình | 2 |

### F03.3: License Alerts

**Priority**: P1  
**Sprint**: 6

| Story ID | User Story | Points |
|----------|------------|--------|
| US-038 | Với tư cách System, tôi muốn cảnh báo license sắp hết hạn | 3 |
| US-039 | Với tư cách System, tôi muốn cảnh báo khi vượt seat | 3 |
| US-040 | Với tư cách Asset Manager, tôi muốn xem license compliance dashboard | 5 |

---

## E04: Inventory Management

### F04.1: Accessories

**Priority**: P1  
**Sprint**: 6

| Story ID | User Story | Points |
|----------|------------|--------|
| US-041 | Với tư cách Warehouse, tôi muốn quản lý phụ kiện (chuột, bàn phím...) | 5 |
| US-042 | Với tư cách Warehouse, tôi muốn checkout/checkin phụ kiện | 5 |
| US-043 | Với tư cách System, tôi muốn cảnh báo tồn kho thấp | 3 |

### F04.2: Components

**Priority**: P1  
**Sprint**: 7

| Story ID | User Story | Points |
|----------|------------|--------|
| US-044 | Với tư cách Warehouse, tôi muốn quản lý linh kiện (RAM, SSD...) | 5 |
| US-045 | Với tư cách IT, tôi muốn lắp linh kiện vào asset | 5 |
| US-046 | Với tư cách IT, tôi muốn gỡ linh kiện từ asset | 3 |

### F04.3: Consumables

**Priority**: P2  
**Sprint**: 7

| Story ID | User Story | Points |
|----------|------------|--------|
| US-047 | Với tư cách Warehouse, tôi muốn quản lý vật tư tiêu hao | 5 |
| US-048 | Với tư cách Warehouse, tôi muốn xuất kho vật tư | 3 |
| US-049 | Với tư cách Asset Manager, tôi muốn xem consumption report | 5 |

---

## E05: Request Workflow

### F05.1: Create Request

**Priority**: P1  
**Sprint**: 8

| Story ID | User Story | Points |
|----------|------------|--------|
| US-050 | Với tư cách User, tôi muốn yêu cầu tài sản mới | 5 |
| US-051 | Với tư cách User, tôi muốn yêu cầu thay thế tài sản | 3 |
| US-052 | Với tư cách User, tôi muốn xem trạng thái yêu cầu của mình | 3 |

### F05.2: Approval Flow

**Priority**: P1  
**Sprint**: 8

| Story ID | User Story | Points |
|----------|------------|--------|
| US-053 | Với tư cách Approver, tôi muốn xem requests pending approval | 3 |
| US-054 | Với tư cách Approver, tôi muốn approve/reject request | 3 |
| US-055 | Với tư cách Approver, tôi muốn yêu cầu thêm thông tin | 2 |
| US-056 | Với tư cách Admin, tôi muốn configure approval chain | 8 |

### F05.3: Fulfillment

**Priority**: P1  
**Sprint**: 9

| Story ID | User Story | Points |
|----------|------------|--------|
| US-057 | Với tư cách Warehouse, tôi muốn fulfill approved request | 5 |
| US-058 | Với tư cách System, tôi muốn auto-checkout khi fulfill | 3 |
| US-059 | Với tư cách User, tôi muốn nhận notification khi request hoàn thành | 2 |

---

## E06: Audit & Compliance

### F06.1: Audit Session

**Priority**: P2  
**Sprint**: 10

| Story ID | User Story | Points |
|----------|------------|--------|
| US-060 | Với tư cách Asset Manager, tôi muốn tạo phiên kiểm kê | 5 |
| US-061 | Với tư cách Auditor, tôi muốn scan assets khi kiểm kê | 5 |
| US-062 | Với tư cách Auditor, tôi muốn mark found/missing/misplaced | 3 |

### F06.2: Discrepancy Handling

**Priority**: P2  
**Sprint**: 10

| Story ID | User Story | Points |
|----------|------------|--------|
| US-063 | Với tư cách Asset Manager, tôi muốn review discrepancies | 5 |
| US-064 | Với tư cách Asset Manager, tôi muốn register unregistered assets | 3 |
| US-065 | Với tư cách Asset Manager, tôi muốn generate audit report | 5 |

---

## E07: Reporting & Analytics

### F07.1: Dashboards

**Priority**: P2  
**Sprint**: 11

| Story ID | User Story | Points |
|----------|------------|--------|
| US-066 | Với tư cách Asset Manager, tôi muốn xem Asset Overview Dashboard | 8 |
| US-067 | Với tư cách Finance, tôi muốn xem Financial Dashboard | 8 |
| US-068 | Với tư cách Manager, tôi muốn xem Team Dashboard | 5 |

### F07.2: Standard Reports

**Priority**: P2  
**Sprint**: 11

| Story ID | User Story | Points |
|----------|------------|--------|
| US-069 | Với tư cách Asset Manager, tôi muốn chạy Asset List Report | 5 |
| US-070 | Với tư cách Asset Manager, tôi muốn chạy Checkout History Report | 5 |
| US-071 | Với tư cách Asset Manager, tôi muốn export reports | 3 |

### F07.3: Custom Reports

**Priority**: P3  
**Sprint**: 12

| Story ID | User Story | Points |
|----------|------------|--------|
| US-072 | Với tư cách Asset Manager, tôi muốn tạo custom report | 13 |
| US-073 | Với tư cách Asset Manager, tôi muốn schedule reports | 5 |
| US-074 | Với tư cách Asset Manager, tôi muốn share reports | 3 |

### F07.4: Alert System

**Priority**: P2  
**Sprint**: 12

| Story ID | User Story | Points |
|----------|------------|--------|
| US-075 | Với tư cách Admin, tôi muốn configure alert rules | 8 |
| US-076 | Với tư cách User, tôi muốn nhận alerts theo subscription | 3 |
| US-077 | Với tư cách Admin, tôi muốn xem alert history | 3 |

---

## E08: Financial Management

### F08.1: Depreciation

**Priority**: P2  
**Sprint**: 13

| Story ID | User Story | Points |
|----------|------------|--------|
| US-078 | Với tư cách Asset Manager, tôi muốn setup depreciation cho asset | 5 |
| US-079 | Với tư cách System, tôi muốn auto-calculate monthly depreciation | 5 |
| US-080 | Với tư cách Asset Manager, tôi muốn xem depreciation reports | 5 |

### F08.2: Cost Tracking

**Priority**: P3  
**Sprint**: 14

| Story ID | User Story | Points |
|----------|------------|--------|
| US-081 | Với tư cách Asset Manager, tôi muốn track maintenance costs | 5 |
| US-082 | Với tư cách Finance, tôi muốn xem Total Cost of Ownership | 8 |

---

## E09: Integration

### F09.1: LDAP/AD

**Priority**: P2  
**Sprint**: 15

| Story ID | User Story | Points |
|----------|------------|--------|
| US-083 | Với tư cách Admin, tôi muốn sync users từ LDAP | 8 |
| US-084 | Với tư cách User, tôi muốn login bằng AD credentials | 5 |

### F09.2: Email

**Priority**: P1  
**Sprint**: 4

| Story ID | User Story | Points |
|----------|------------|--------|
| US-085 | Với tư cách System, tôi muốn gửi email notifications | 5 |
| US-086 | Với tư cách Admin, tôi muốn customize email templates | 5 |

### F09.3: API

**Priority**: P2  
**Sprint**: 15

| Story ID | User Story | Points |
|----------|------------|--------|
| US-087 | Với tư cách Developer, tôi muốn access REST API | 8 |
| US-088 | Với tư cách Admin, tôi muốn manage API keys | 3 |

---

## E10: Advanced Features

### F10.1: Label Printing

**Priority**: P2  
**Sprint**: 14

| Story ID | User Story | Points |
|----------|------------|--------|
| US-089 | Với tư cách Asset Manager, tôi muốn design label templates | 8 |
| US-090 | Với tư cách Warehouse, tôi muốn print asset labels | 5 |

### F10.2: Mobile App

**Priority**: P3  
**Sprint**: Future

| Story ID | User Story | Points |
|----------|------------|--------|
| US-091 | Với tư cách Auditor, tôi muốn scan assets bằng mobile | 13 |
| US-092 | Với tư cách User, tôi muốn xem my assets trên mobile | 8 |

---

## Sprint Planning Summary

| Sprint | Focus | Key Features | Story Points |
|--------|-------|--------------|--------------|
| 1 | Foundation | Categories, Locations, Basic setup | 25 |
| 2 | Core Assets | Asset CRUD, Models, Manufacturers | 30 |
| 3 | Checkout | Checkout/Checkin basic flow | 35 |
| 4 | Checkout+ | Transfer, Overdue, Email | 30 |
| 5 | Licenses | License management | 25 |
| 6 | Licenses+ & Accessories | Alerts, Accessories | 30 |
| 7 | Components & Consumables | Full inventory | 30 |
| 8 | Requests | Request & Approval | 35 |
| 9 | Fulfillment | Complete workflow | 20 |
| 10 | Audit | Audit functionality | 30 |
| 11 | Reports | Dashboards & Standard reports | 35 |
| 12 | Reports+ | Custom reports, Alerts | 30 |
| 13 | Financial | Depreciation | 20 |
| 14 | Labels & Costs | Printing, Cost tracking | 25 |
| 15 | Integration | LDAP, API | 25 |

**Total Estimated**: ~425 story points

---

## Definition of Done

- [ ] Code complete with unit tests (>70% coverage)
- [ ] Code reviewed and approved
- [ ] API documentation updated
- [ ] UI/UX matches design specs
- [ ] Accessibility requirements met
- [ ] Performance requirements met
- [ ] Security scan passed
- [ ] Integration tests passed
- [ ] Deployed to staging
- [ ] QA sign-off
- [ ] User documentation updated
- [ ] Release notes prepared
