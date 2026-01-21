#!/usr/bin/env node
/**
 * Translate [TODO] keys in vi.json
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Translation mappings - manual translations for missing keys
const translations = {
    // Nav
    'nav.devices': 'Thiết bị',

    // Common
    'common.description': 'Mô tả',
    'common.id': 'ID',
    'common.noResults': 'Không có kết quả',
    'common.required': 'Bắt buộc',
    'common.submitting': 'Đang gửi...',

    // CMDB
    'cmdb.code': 'Mã',
    'cmdb.noServices': 'Không có dịch vụ',
    'cmdb.selectService': 'Chọn dịch vụ',

    // Assets
    'assets.assignAsset': 'Gán tài sản',
    'assets.assigneeId': 'ID người được gán',
    'assets.assigneeName': 'Tên người được gán',
    'assets.brand': 'Thương hiệu',
    'assets.department': 'Phòng ban',
    'assets.filterable': 'Có thể lọc',
    'assets.managementIp': 'IP quản lý',
    'assets.newDraft': 'Bản nháp mới',
    'assets.noSpecFields': 'Không có trường thông số',
    'assets.note': 'Ghi chú',
    'assets.notes': 'Ghi chú',
    'assets.payloadJson': 'Payload JSON',
    'assets.person': 'Người',
    'assets.placeholders.assigneeId': 'ID người được gán',
    'assets.placeholders.assigneeName': 'Tên người được gán',
    'assets.placeholders.note': 'Ghi chú',
    'assets.publish': 'Xuất bản',
    'assets.readonly': 'Chỉ đọc',
    'assets.scan': 'Quét',
    'assets.scanning': 'Đang quét...',
    'assets.searchable': 'Có thể tìm kiếm',
    'assets.selectModel': 'Chọn mẫu mã',
    'assets.selectVendor': 'Chọn nhà cung cấp',
    'assets.statusLabels.disposed': 'Đã thanh lý',
    'assets.statusLabels.inRepair': 'Đang sửa chữa',
    'assets.statusLabels.inStock': 'Có sẵn',
    'assets.statusLabels.inUse': 'Đang sử dụng',
    'assets.statusLabels.lost': 'Mất',
    'assets.statusLabels.retired': 'Ngừng sử dụng',
    'assets.submitRequest': 'Gửi yêu cầu',
    'assets.system': 'Hệ thống',
    'assets.type': 'Loại',

    // Maintenance
    'maintenance.openMaintenance': 'Mở phiếu bảo trì',
    'maintenance.titleLabel': 'Tiêu đề',

    // Models
    'models.capabilities': 'Khả năng',
    'models.context': 'Ngữ cảnh',
    'models.contextWindow': 'Cửa sổ ngữ cảnh',
    'models.costPer1K': 'Chi phí /1K',
    'models.costPer1kInput': 'Chi phí /1k đầu vào',
    'models.costPer1kOutput': 'Chi phí /1k đầu ra',
    'models.groupByProvider': 'Nhóm theo nhà cung cấp',
    'models.groupByStatus': 'Nhóm theo trạng thái',
    'models.maxTokens': 'Token tối đa',
    'models.model': 'Mô hình',
    'models.models': 'Mô hình',
    'models.noModelsFound': 'Không tìm thấy mô hình',
    'models.orchestration': 'Điều phối',
    'models.placeholders.displayName': 'Tên hiển thị',
    'models.provider': 'Nhà cung cấp',
    'models.saveModel': 'Lưu mô hình',
    'models.searchPlaceholder': 'Tìm kiếm mô hình...',
    'models.searchProvider': 'Tìm kiếm nhà cung cấp',
    'models.viewDiagram': 'Xem sơ đồ',

    // NetOps
    'netops.backTo': 'Quay lại',
    'netops.backToChanges': 'Quay lại danh sách thay đổi',
    'netops.compare': 'So sánh',
    'netops.compareConfigs': 'So sánh cấu hình',
    'netops.compareWith': 'So sánh với',
    'netops.comparing': 'Đang so sánh...',
    'netops.noOtherConfigs': 'Không có cấu hình khác',
    'netops.parseNormalize': 'Phân tích & Chuẩn hoá',
    'netops.parsing': 'Đang phân tích...',
    'netops.runLint': 'Chạy lint',
    'netops.running': 'Đang chạy...',
    'netops.selectConfigVersion': 'Chọn phiên bản cấu hình',

    // Warehouse
    'warehouse.checkingStock': 'Đang kiểm tra tồn kho...',
    'warehouse.description': 'Mô tả',
    'warehouse.direction': 'Hướng',
    'warehouse.documents': 'Tài liệu',
    'warehouse.noLines': 'Chưa thêm dòng nào.',
    'warehouse.note': 'Ghi chú',
    'warehouse.partSearchPlaceholder': 'Tìm kiếm linh kiện...',
    'warehouse.qty': 'Số lượng',
    'warehouse.reports': 'Báo cáo',
    'warehouse.serial': 'Serial',
    'warehouse.spareParts': 'Linh kiện dự phòng',
    'warehouse.warehouses': 'Kho hàng'
};

// Recursively find and replace [TODO] values
function translateTodos(obj, prefix = '') {
    let count = 0;

    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string' && value.startsWith('[TODO]')) {
            if (translations[fullKey]) {
                obj[key] = translations[fullKey];
                console.log(pc.green(`  ✓ ${fullKey}: "${translations[fullKey]}"`));
                count++;
            } else {
                console.log(pc.yellow(`  ⚠ ${fullKey}: No translation found`));
            }
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            count += translateTodos(value, fullKey);
        }
    }

    return count;
}

// Main execution
async function main() {
    console.log(pc.cyan('\n🌐 Translating [TODO] keys to Vietnamese...\n'));

    const viPath = path.join(rootDir, 'apps/web-ui/src/lib/i18n/locales/vi.json');
    const viContent = JSON.parse(await fs.readFile(viPath, 'utf-8'));

    const count = translateTodos(viContent);

    // Save file
    await fs.writeFile(viPath, JSON.stringify(viContent, null, 2) + '\n');

    console.log(pc.cyan(`\n✓ Translated ${count} keys in vi.json\n`));
}

main().catch(err => {
    console.error(pc.red('Error:'), err);
    process.exit(1);
});
