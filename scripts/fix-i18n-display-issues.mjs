#!/usr/bin/env node
/**
 * Find and fix i18n key issues - incorrect values in locale files
 */
import fs from 'fs/promises';
import pc from 'picocolors';

const EN_PATH = 'apps/web-ui/src/lib/i18n/locales/en.json';
const VI_PATH = 'apps/web-ui/src/lib/i18n/locales/vi.json';

// Known fixes for incorrectly cased values
const FIXES = {
    // Warehouse fixes
    'warehouse.description': { en: 'Manage stock, documents, and reporting for spare parts', vi: 'Quản lý kho, tài liệu và báo cáo cho phụ tùng' },
    'warehouse.reports': { en: 'Reports', vi: 'Báo cáo' },
    'warehouse.warehouses': { en: 'Warehouses', vi: 'Kho' },
    'warehouse.documents': { en: 'Documents', vi: 'Tài liệu' },
    'warehouse.spareParts': { en: 'Spare Parts', vi: 'Phụ tùng' },
    'warehouse.qty': { en: 'Qty', vi: 'Số lượng' },
    'warehouse.serial': { en: 'Serial', vi: 'Serial' },
    'warehouse.note': { en: 'Note', vi: 'Ghi chú' },
    'warehouse.direction': { en: 'Direction', vi: 'Hướng' },
    'warehouse.noLines': { en: 'No lines added', vi: 'Chưa có dòng nào' },
    'warehouse.partSearchPlaceholder': { en: 'Search parts...', vi: 'Tìm kiếm phụ tùng...' },
    'warehouse.checkingStock': { en: 'Checking stock...', vi: 'Đang kiểm tra kho...' },

    // Maintenance fixes
    'maintenance.titleLabel': { en: 'Title', vi: 'Tiêu đề' },
    'maintenance.openMaintenance': { en: 'Open Maintenance', vi: 'Mở bảo trì' },
    'maintenance.tickets': { en: 'Tickets', vi: 'Phiếu' },

    // Models fixes
    'models.capabilities': { en: 'Capabilities', vi: 'Khả năng' },
    'models.context': { en: 'Context', vi: 'Ngữ cảnh' },
    'models.contextWindow': { en: 'Context Window', vi: 'Cửa sổ ngữ cảnh' },
    'models.costPer1K': { en: 'Cost $/1K', vi: 'Chi phí $/1K' },
    'models.costPer1kInput': { en: 'Cost $/1k Input', vi: 'Chi phí $/1k đầu vào' },
    'models.costPer1kOutput': { en: 'Cost $/1k Output', vi: 'Chi phí $/1k đầu ra' },
    'models.groupByProvider': { en: 'Group by Provider', vi: 'Nhóm theo nhà cung cấp' },
    'models.groupByStatus': { en: 'Group by Status', vi: 'Nhóm theo trạng thái' },
    'models.maxTokens': { en: 'Max Tokens', vi: 'Số token tối đa' },
    'models.model': { en: 'Model', vi: 'Mô hình' },
    'models.models': { en: 'Models', vi: 'Mô hình' },
    'models.noModelsFound': { en: 'No Models Found', vi: 'Không tìm thấy mô hình' },
    'models.orchestration': { en: 'Orchestration', vi: 'Điều phối' },
    'models.provider': { en: 'Provider', vi: 'Nhà cung cấp' },
    'models.saveModel': { en: 'Save Model', vi: 'Lưu mô hình' },
    'models.searchPlaceholder': { en: 'Search models...', vi: 'Tìm kiếm mô hình...' },
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

function getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
        if (!current || typeof current !== 'object') return undefined;
        current = current[part];
    }

    return current;
}

async function main() {
    console.log(pc.cyan('\n🔧 Fixing i18n display issues...\n'));

    // Load locale files
    const enContent = JSON.parse(await fs.readFile(EN_PATH, 'utf-8'));
    const viContent = JSON.parse(await fs.readFile(VI_PATH, 'utf-8'));

    let fixedCount = 0;

    for (const [key, values] of Object.entries(FIXES)) {
        const currentEn = getNestedValue(enContent, key);
        const currentVi = getNestedValue(viContent, key);

        console.log(pc.gray(`Checking ${key}...`));

        if (currentEn !== values.en) {
            console.log(pc.yellow(`  EN: "${currentEn}" → "${values.en}"`));
            setNestedValue(enContent, key, values.en);
            fixedCount++;
        }

        if (currentVi !== values.vi) {
            console.log(pc.yellow(`  VI: "${currentVi}" → "${values.vi}"`));
            setNestedValue(viContent, key, values.vi);
            fixedCount++;
        }
    }

    // Save files
    await fs.writeFile(EN_PATH, JSON.stringify(enContent, null, 2) + '\n');
    await fs.writeFile(VI_PATH, JSON.stringify(viContent, null, 2) + '\n');

    console.log(pc.green(`\n✓ Fixed ${fixedCount} i18n values\n`));
}

main().catch(console.error);
