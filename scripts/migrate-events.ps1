# Migrate Svelte 4 event handlers (on:event) to Svelte 5 event attributes (onevent)
$ErrorActionPreference = 'Stop'

$files = Get-ChildItem -Path "apps/web-ui/src" -Filter "*.svelte" -Recurse
Write-Host "Found $($files.Count) Svelte files`n" -ForegroundColor Yellow

$eventMappings = @{
    '\bon:click=' = 'onclick='
    '\bon:dblclick=' = 'ondblclick='
    '\bon:submit=' = 'onsubmit='
    '\bon:change=' = 'onchange='
    '\bon:input=' = 'oninput='
    '\bon:focus=' = 'onfocus='
    '\bon:blur=' = 'onblur='
    '\bon:keydown=' = 'onkeydown='
    '\bon:keyup=' = 'onkeyup='
    '\bon:keypress=' = 'onkeypress='
    '\bon:mousedown=' = 'onmousedown='
    '\bon:mouseup=' = 'onmouseup='
    '\bon:mouseenter=' = 'onmouseenter='
    '\bon:mouseleave=' = 'onmouseleave='
    '\bon:mousemove=' = 'onmousemove='
    '\bon:mouseover=' = 'onmouseover='
    '\bon:mouseout=' = 'onmouseout='
    '\bon:close=' = 'onclose='
    '\bon:select=' = 'onselect='
    '\bon:load=' = 'onload='
    '\bon:error=' = 'onerror='
    '\bon:scroll=' = 'onscroll='
    '\bon:resize=' = 'onresize='
    '\bon:wheel=' = 'onwheel='
    '\bon:contextmenu=' = 'oncontextmenu='
}

$count = 0
$totalChanges = 0

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    $fileChanges = 0
    
    foreach ($pattern in $eventMappings.Keys) {
        $replacement = $eventMappings[$pattern]
        $matches = [regex]::Matches($content, $pattern)
        if ($matches.Count -gt 0) {
            $content = $content -replace $pattern, $replacement
            $fileChanges += $matches.Count
        }
    }
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        $count++
        $totalChanges += $fileChanges
        $rel = $file.FullName.Replace((Get-Location).Path + '\', '')
        Write-Host "✅ $rel ($fileChanges changes)" -ForegroundColor Green
    }
}

Write-Host "`n✨ Migration complete!" -ForegroundColor Cyan
Write-Host "  Files updated: $count/$($files.Count)" -ForegroundColor White
Write-Host "  Total changes: $totalChanges" -ForegroundColor White
Write-Host "`n📝 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review changes with: git diff" -ForegroundColor Gray
Write-Host "  2. Check for any remaining warnings" -ForegroundColor Gray
Write-Host "  3. Test the application" -ForegroundColor Gray
