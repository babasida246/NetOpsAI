#!/usr/bin/env node
/**
 * Auto-fix untranslated i18n values based on cross-reference results
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const EN_PATH = path.join(rootDir, 'apps/web-ui/src/lib/i18n/locales/en.json');
const VI_PATH = path.join(rootDir, 'apps/web-ui/src/lib/i18n/locales/vi.json');
const REPORT_PATH = path.join(rootDir, 'i18n-cross-reference.json');

// Proper translations for common untranslated values
const EN_FIXES = {
    // Common
    'common.all': 'All',
    'common.type': 'Type',
    'common.from': 'From',
    'common.to': 'To',
    'common.code': 'Code',
    'common.date': 'Date',
    'common.actions': 'Actions',
    'common.view': 'View',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.name': 'Name',
    'common.previous': 'Previous',
    'common.next': 'Next',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.apply': 'Apply',
    'common.clear': 'Clear',
    'common.total': 'Total',
    'common.back': 'Back',
    'common.notes': 'Notes',
    'common.create': 'Create',
    'common.refresh': 'Refresh',
    'common.plus': 'Plus',
    'common.minus': 'Minus',

    // Warehouse
    'warehouse.part': 'Part',
    'warehouse.qty': 'Qty',
    'warehouse.serial': 'Serial',
    'warehouse.direction': 'Direction',
    'warehouse.note': 'Note',
    'warehouse.documents': 'Documents',
    'warehouse.warehouse': 'Warehouse',
    'warehouse.reports': 'Reports',
    'warehouse.warehouses': 'Warehouses',
    'warehouse.lot': 'Lot',
    'warehouse.expiry': 'Expiry',
    'warehouse.value': 'Value',
    'warehouse.manufacturer': 'Manufacturer',
    'warehouse.lines': 'Lines',
    'warehouse.post': 'Post',
    'warehouse.uom': 'UOM',
    'warehouse.docTypes.receipt': 'Receipt',
    'warehouse.docTypes.issue': 'Issue',
    'warehouse.docTypes.adjust': 'Adjust',
    'warehouse.docTypes.transfer': 'Transfer',
    'warehouse.docStatus.draft': 'Draft',
    'warehouse.docStatus.posted': 'Posted',
    'warehouse.docStatus.canceled': 'Canceled',
    'warehouse.reportOptions.valuation': 'Valuation',

    // Assets
    'assets.status': 'Status',
    'assets.category': 'Category',
    'assets.location': 'Location',
    'assets.model': 'Model',

    // Inventory
    'inventory.reserved': 'Reserved',
    'inventory.available': 'Available',

    // Table
    'table.page': 'Page'
};

const VI_FIXES = {
    // Common
    'common.all': 'Tất cả',
    'common.type': 'Loại',
    'common.from': 'Từ',
    'common.to': 'Đến',
    'common.code': 'Mã',
    'common.date': 'Ngày',
    'common.actions': 'Thao tác',
    'common.view': 'Xem',
    'common.edit': 'Sửa',
    'common.search': 'Tìm kiếm',
    'common.name': 'Tên',
    'common.previous': 'Trước',
    'common.next': 'Tiếp',
    'common.cancel': 'Hủy',
    'common.save': 'Lưu',
    'common.apply': 'Áp dụng',
    'common.clear': 'Xóa',
    'common.total': 'Tổng',
    'common.back': 'Quay lại',
    'common.notes': 'Ghi chú',
    'common.create': 'Tạo',
    'common.refresh': 'Làm mới',
    'common.plus': 'Cộng',
    'common.minus': 'Trừ',

    // Warehouse
    'warehouse.part': 'Linh kiện',
    'warehouse.qty': 'SL',
    'warehouse.serial': 'Serial',
    'warehouse.direction': 'Hướng',
    'warehouse.note': 'Ghi chú',
    'warehouse.documents': 'Tài liệu',
    'warehouse.warehouse': 'Kho',
    'warehouse.reports': 'Báo cáo',
    'warehouse.warehouses': 'Kho hàng',
    'warehouse.lot': 'Lô',
    'warehouse.expiry': 'Hết hạn',
    'warehouse.value': 'Giá trị',
    'warehouse.manufacturer': 'Nhà sản xuất',
    'warehouse.lines': 'Dòng',
    'warehouse.post': 'Đăng',
    'warehouse.uom': 'ĐVT',
    'warehouse.docTypes.receipt': 'Nhập kho',
    'warehouse.docTypes.issue': 'Xuất kho',
    'warehouse.docTypes.adjust': 'Điều chỉnh',
    'warehouse.docTypes.transfer': 'Chuyển kho',
    'warehouse.docStatus.draft': 'Nháp',
    'warehouse.docStatus.posted': 'Đã đăng',
    'warehouse.docStatus.canceled': 'Đã hủy',
    'warehouse.reportOptions.valuation': 'Định giá',

    // Assets
    'assets.status': 'Trạng thái',
    'assets.category': 'Danh mục',
    'assets.location': 'Vị trí',
    'assets.model': 'Model',

    // Inventory
    'inventory.reserved': 'Đã đặt',
    'inventory.available': 'Khả dụng',

    // Table
    'table.page': 'Trang'
};

function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
}

async function main() {
    console.log(pc.cyan('\n🔧 Auto-fixing untranslated i18n values...\n'));

    // Load locale files
    const enContent = JSON.parse(await fs.readFile(EN_PATH, 'utf-8'));
    const viContent = JSON.parse(await fs.readFile(VI_PATH, 'utf-8'));

    let fixedEn = 0;
    let fixedVi = 0;

    // Apply EN fixes
    for (const [key, value] of Object.entries(EN_FIXES)) {
        console.log(pc.gray(`EN: ${key} → "${value}"`));
        setNestedValue(enContent, key, value);
        fixedEn++;
    }

    // Apply VI fixes
    for (const [key, value] of Object.entries(VI_FIXES)) {
        console.log(pc.gray(`VI: ${key} → "${value}"`));
        setNestedValue(viContent, key, value);
        fixedVi++;
    }

    // Save files
    await fs.writeFile(EN_PATH, JSON.stringify(enContent, null, 2) + '\n');
    await fs.writeFile(VI_PATH, JSON.stringify(viContent, null, 2) + '\n');

    console.log(pc.green(`\n✓ Fixed ${fixedEn} EN values and ${fixedVi} VI values\n`));
}

main().catch(console.error);
