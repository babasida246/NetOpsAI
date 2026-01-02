$files = Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch '\.bak$' -and $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.git\\' }
foreach ($f in $files) {
    $matches = Select-String -Path $f.FullName -Pattern 'hospital' -SimpleMatch -ErrorAction SilentlyContinue
    foreach ($m in $matches) { Write-Output "$($f.FullName):$($m.LineNumber): $($m.Line)" }
}