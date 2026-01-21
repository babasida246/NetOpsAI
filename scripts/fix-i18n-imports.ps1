# Fix i18n imports in all Svelte files
$files = @(
    "apps/web-ui/src/lib/assets/components/catalogs/SpecFieldForm.svelte",
    "apps/web-ui/src/lib/warehouse/StockDocumentLines.svelte",
    "apps/web-ui/src/routes/(assets)/warehouse/+layout.svelte",
    "apps/web-ui/src/lib/components/inventory/StockCheckPanel.svelte",
    "apps/web-ui/src/lib/components/inventory/PermissionGate.svelte",
    "apps/web-ui/src/lib/components/inventory/LotPicker.svelte",
    "apps/web-ui/src/lib/components/inventory/FxPreviewPanel.svelte",
    "apps/web-ui/src/lib/components/inventory/EntitySelect.svelte",
    "apps/web-ui/src/lib/components/inventory/DocumentLinesGrid.svelte",
    "apps/web-ui/src/routes/netops/configs/[versionId]/+page.svelte",
    "apps/web-ui/src/routes/netops/changes/[id]/+page.svelte",
    "apps/web-ui/src/routes/netops/+layout.svelte",
    "apps/web-ui/src/lib/cmdb/CmdbServiceDetail.svelte",
    "apps/web-ui/src/lib/cmdb/CmdbServicesPanel.svelte",
    "apps/web-ui/src/lib/assets/components/WorkflowRequestForm.svelte",
    "apps/web-ui/src/lib/assets/components/MaintenanceModal.svelte",
    "apps/web-ui/src/lib/assets/components/InventoryScanPanel.svelte",
    "apps/web-ui/src/lib/assets/components/ImportWizard.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/LocationCatalog.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/SpecDefsManager.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/VendorCatalog.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/StatusCatalog.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/SpecVersionControls.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/SpecDefsTable.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/ModelTable.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/ModelForm.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/ModelFilters.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/CategorySpecPanel.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/DynamicSpecForm.svelte",
    "apps/web-ui/src/lib/assets/components/catalogs/CategoryCatalog.svelte"
)

foreach ($file in $files) {
    $fullPath = Join-Path "E:\GitHub\MCP server" $file
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Encoding UTF8
        $newContent = $content -replace 'import \{ \$_, \$isLoading \} from ''\$lib/i18n'';', 'import { _, isLoading } from ''$lib/i18n'';'
        $newContent | Set-Content $fullPath -Encoding UTF8
        Write-Host "Fixed: $file"
    } else {
        Write-Host "Not found: $file"
    }
}

Write-Host "`nDone! Fixed imports in all files."
