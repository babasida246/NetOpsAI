# MODULE: REPORTS & ALERTS (Báo cáo & Cảnh báo)

## 1. Mục tiêu nghiệp vụ

- Cung cấp báo cáo tổng hợp về tài sản IT
- Dashboard trực quan cho quản lý
- Hệ thống cảnh báo tự động (license, warranty, stock...)
- Export dữ liệu cho các mục đích khác nhau

---

## 2. Đối tượng dữ liệu

### 2.1 Report Definition

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Report ID | Mã báo cáo | ● |
| Tên báo cáo | Report name | ● |
| Loại | dashboard / tabular / chart / scheduled | ● |
| Mô tả | Description | ○ |
| Data source | Nguồn dữ liệu | ● |
| Filters | Available filters | ○ |
| Columns/Fields | Các trường hiển thị | ● |
| Access level | Phân quyền xem | ● |
| Is scheduled | Có chạy định kỳ | ● |
| Schedule | Cron expression | ○ |

### 2.2 Alert Rule

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Rule ID | Mã rule | ● |
| Tên | Rule name | ● |
| Loại | license / warranty / stock / custom | ● |
| Điều kiện | Condition expression | ● |
| Ngưỡng | Threshold values | ● |
| Recipients | Người nhận | ● |
| Kênh | email / in-app / both | ● |
| Tần suất | once / daily / weekly | ● |
| Active | Is active | ● |

### 2.3 Alert History

| Trường | Mô tả |
|--------|-------|
| Alert Rule | Thuộc rule nào |
| Triggered at | Thời điểm trigger |
| Data | Dữ liệu trigger |
| Recipients | Ai đã nhận |
| Status | sent / failed |

---

## 3. Built-in Reports

### 3.1 Dashboard Reports

#### RPT-DASH-01: Asset Overview Dashboard

**Widgets**:
- Total assets by status (pie chart)
- Assets by category (bar chart)
- Recent activities (timeline)
- Upcoming expirations (list)
- Assets by location (map/treemap)

#### RPT-DASH-02: Financial Dashboard

**Widgets**:
- Total asset value
- Depreciation this month/quarter/year
- Book value by category
- Purchase trend (line chart)
- Top 10 expensive assets

#### RPT-DASH-03: Compliance Dashboard

**Widgets**:
- License compliance status
- Overdue checkouts
- Pending audits
- Missing assets
- Warranty status overview

---

### 3.2 Tabular Reports

#### RPT-TAB-01: Asset List Report

**Filters**:
- Category, Status, Location
- Date range (purchase, checkout)
- User assigned
- Custom fields

**Columns**:
- All asset fields
- Customizable column selection
- Sortable, groupable

**Export**: Excel, CSV, PDF

---

#### RPT-TAB-02: License Compliance Report

**Columns**:
- License name
- Vendor
- Type
- Seats allowed
- Seats used
- % Utilization
- Expiry date
- Status

**Highlights**:
- 🔴 Over-licensed
- 🟡 High utilization (>90%)
- 🟠 Expiring soon

---

#### RPT-TAB-03: Checkout History Report

**Filters**:
- Date range
- User
- Asset category
- Status (active/returned/overdue)

**Columns**:
- Asset
- Checked out to
- Checkout date
- Expected return
- Actual return
- Duration
- Status

---

#### RPT-TAB-04: Depreciation Report

**Filters**:
- Period (month/quarter/year)
- Category
- Status

**Columns**:
- Asset
- Original cost
- Depreciation amount
- Accumulated
- Book value
- % Depreciated

**Summary**:
- Total by category
- Grand total

---

#### RPT-TAB-05: Audit Report

**Content**:
- Audit summary
- Found/Missing/Misplaced counts
- Detail by location
- Discrepancy list
- Unregistered assets found
- Recommendations

---

### 3.3 Chart Reports

#### RPT-CHART-01: Asset Lifecycle

Line chart showing:
- Assets acquired over time
- Assets retired over time
- Net asset count

#### RPT-CHART-02: Cost Analysis

- Purchase cost by category (stacked bar)
- Monthly spend trend
- Cost per department

#### RPT-CHART-03: Utilization

- Asset utilization rate
- Checkout frequency
- Idle assets

---

## 4. Alert Rules (Built-in)

### 4.1 License Alerts

| Rule | Điều kiện | Mặc định |
|------|-----------|----------|
| License expiring | Expiry date within X days | 30 days |
| License expired | Expiry date passed | Immediate |
| License over-seat | Used > Allowed | Immediate |
| License high usage | Used >= X% of Allowed | 90% |

### 4.2 Warranty Alerts

| Rule | Điều kiện | Mặc định |
|------|-----------|----------|
| Warranty expiring | Warranty end within X days | 30 days |
| Warranty expired | Warranty end passed | Immediate |

### 4.3 Stock Alerts

| Rule | Điều kiện | Mặc định |
|------|-----------|----------|
| Accessory low stock | Quantity <= Min | Immediate |
| Consumable low stock | Quantity <= Reorder point | Immediate |
| Out of stock | Quantity = 0 | Immediate |

### 4.4 Checkout Alerts

| Rule | Điều kiện | Mặc định |
|------|-----------|----------|
| Due soon | Expected return in X days | 3 days |
| Overdue | Expected return passed | Daily reminder |

### 4.5 Depreciation Alerts

| Rule | Điều kiện | Mặc định |
|------|-----------|----------|
| Fully depreciated | Book value = Salvage | Immediate |
| Near full depreciation | Remaining <= X months | 3 months |

---

## 5. Các màn hình/chức năng chính

### MH-RPT-01: Reports Library

**Layout**:
- Categories: All, Dashboard, Tabular, Chart
- Search reports
- Favorites
- Recently viewed

**Actions**:
- Run report
- Schedule
- Customize
- Export

---

### MH-RPT-02: Report Viewer

**Features**:
- Dynamic filters
- Column customization
- Sorting, grouping
- Export (Excel, PDF, CSV)
- Save as new report
- Share link

---

### MH-RPT-03: Report Builder

**Mô tả**: Tạo custom report

**Steps**:
```
1. Chọn data source (Assets, Checkouts, Licenses...)
2. Chọn fields/columns
3. Định nghĩa filters
4. Chọn layout (table/chart)
5. Configure grouping/sorting
6. Preview
7. Save
```

---

### MH-RPT-04: Alert Configuration

**Features**:
- List all alert rules
- Enable/Disable rules
- Edit thresholds
- Configure recipients
- View alert history

---

### MH-RPT-05: Scheduled Reports

**Features**:
- Schedule reports to run periodically
- Email delivery
- Multiple formats
- Multiple recipients

**Schedule options**:
- Daily at X time
- Weekly on X day
- Monthly on X date
- Custom cron

---

## 6. Quy tắc nghiệp vụ

| Mã | Quy tắc | Loại | Mô tả |
|----|---------|------|-------|
| RPT-R01 | Access control | Hard | Reports filtered by user's data access |
| RPT-R02 | Export limit | Soft | Cảnh báo khi export > 10,000 rows |
| RPT-R03 | Schedule permission | Hard | Chỉ Asset Manager+ được schedule reports |
| ALR-R01 | No duplicate alerts | Soft | Không gửi cùng alert trong X giờ |
| ALR-R02 | Alert limit | Soft | Max X alerts/user/day để tránh spam |
| ALR-R03 | Critical bypass | Hard | Critical alerts bypass limits |

---

## 7. Phân quyền chi tiết

| Hành động | Requester | Approver | Warehouse/IT | Asset Manager | Admin |
|-----------|:---------:|:--------:|:------------:|:-------------:|:-----:|
| Xem Dashboard | ○¹ | ● | ● | ● | ● |
| Xem Reports | ○¹ | ● | ● | ● | ● |
| Run Reports | ○¹ | ● | ● | ● | ● |
| Create Custom Report | ✗ | ✗ | ✗ | ● | ● |
| Schedule Reports | ✗ | ✗ | ✗ | ● | ● |
| Export Data | ✗ | ● | ● | ● | ● |
| Configure Alerts | ✗ | ✗ | ✗ | ● | ● |
| Receive Alerts | ○² | ○² | ● | ● | ● |

> ¹ Chỉ xem data trong scope (own assets)
> ² Chỉ alerts liên quan

---

## 8. Tiêu chí nghiệm thu

### AC-RPT-01: View Dashboard

```gherkin
Given   Asset Manager đăng nhập
When    Truy cập Asset Overview Dashboard
Then    Hiển thị:
   - Pie chart: Assets by status
   - Bar chart: Assets by category
   - List: Upcoming expirations
   - Timeline: Recent activities
And     Data phản ánh đúng dữ liệu thực tế
```

### AC-RPT-02: Run Report với Filter

```gherkin
Given   Có 1000 assets trong hệ thống
When    Chạy Asset List Report với filter:
   - Category = Laptop
   - Status = Deployed
   - Location = Tầng 3
Then    Hiển thị đúng các assets thỏa điều kiện
And     Có thể sort, group kết quả
And     Export Excel thành công
```

### AC-RPT-03: Alert trigger

```gherkin
Given   Alert rule "License expiring" active với threshold 30 days
And     License X có expiry_date = today + 25 days
When    Alert job chạy
Then    Alert triggered
And     Email gửi đến configured recipients
And     Alert logged trong history
```

### AC-RPT-04: Scheduled report

```gherkin
Given   Report "Monthly Asset Summary" scheduled every 1st of month
When    Ngày 1 tháng X
Then    Report auto-generated
And     Email with attachment gửi đến recipients
And     Log ghi nhận execution
```

### AC-RPT-05: Custom report

```gherkin
Given   Asset Manager cần report đặc thù
When    Sử dụng Report Builder:
   - Source: Assets
   - Fields: Tag, Name, Category, Purchase_Date, Value
   - Filter: Purchase_Date in last 6 months
   - Group by: Category
Then    Report được tạo và lưu
And     Có thể chạy bất kỳ lúc nào
And     Có thể schedule
```

### AC-RPT-06: Alert no spam

```gherkin
Given   Same license triggered "expiring" alert yesterday
When    Alert job chạy today
Then    Không gửi duplicate alert
And     Original alert still tracked
```
