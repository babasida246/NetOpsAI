# Rename project strings to NetOpsAI across the repository
# Backup files with .bak extension before modifying
$root = Resolve-Path ".." -Relative | ForEach-Object { $_ }
# If script run from repo root, $PWD is correct
$excludedDirs = @('.git', 'node_modules', 'dist', 'build', '.venv', '.venv3', '.venv2')
Write-Host "Starting rename in" (Get-Location)
$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    foreach ($ex in $excludedDirs) { if ($_.FullName -like "*\\$ex\\*") { return $false } }
    return $true
}

$replacements = @(
    @{p = 'netopsai_gateway'; r = 'netopsai_gateway' },
    @{p = 'netopsai-gateway'; r = 'netopsai-gateway' },
    @{p = 'netopsai-it-gateway'; r = 'netopsai-it-gateway' },
    @{p = 'netopsai_it_gateway'; r = 'netopsai_it_gateway' },
    @{p = 'netopsai_gateway_test'; r = 'netopsai_gateway_test' },
    @{p = 'netopsai-'; r = 'netopsai-' },
    @{p = 'netopsai_'; r = 'netopsai_' },
    @{p = 'NetOpsAI'; r = 'NetOpsAI' },
    @{p = 'NetOpsAI'; r = 'NetOpsAI' },
    @{p = 'NetOpsAI'; r = 'NetOpsAI' },
    @{p = 'NetOpsAI'; r = 'NetOpsAI' } # general fallback (case-insensitive)
)

foreach ($file in $files) {
    try {
        $text = Get-Content -Raw -LiteralPath $file.FullName -ErrorAction Stop
    }
    catch {
        continue
    }
    $orig = $text
    foreach ($item in $replacements) {
        $pattern = [Regex]::Escape($item.p)
        if ($item.p -match '[A-Za-z]$') {
            # do case-insensitive replacement for word patterns
            $text = [Regex]::Replace($text, $pattern, $item.r, 'IgnoreCase')
        }
        else {
            # literal replace for patterns that include non-word separators
            $text = $text -replace [Regex]::Escape($item.p), $item.r
        }
    }
    if ($text -ne $orig) {
        Copy-Item -LiteralPath $file.FullName -Destination ($file.FullName + '.bak') -Force
        Set-Content -LiteralPath $file.FullName -Value $text -Force
        Write-Host "Patched:" $file.FullName
    }
}
Write-Host "Rename complete. Backups created with .bak."
