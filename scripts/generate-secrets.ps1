#!/usr/bin/env pwsh
# Generate secure secrets for NetOpsAI

Write-Host "Generating secure secrets..." -ForegroundColor Cyan

# Generate ENCRYPTION_KEY (64 hex characters = 256 bits)
$encryptionKey = -join ((1..64 | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) }))

# Generate JWT_SECRET (64 characters)
$jwtSecret = -join ((1..64 | ForEach-Object { 
            $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
            $chars[(Get-Random -Maximum $chars.Length)]
        }))

Write-Host "`n=== Generated Secrets ===" -ForegroundColor Green
Write-Host "`nENCRYPTION_KEY (Add to .env):" -ForegroundColor Yellow
Write-Host $encryptionKey

Write-Host "`nJWT_SECRET (Add to .env):" -ForegroundColor Yellow
Write-Host $jwtSecret

Write-Host "`n=== .env Template ===" -ForegroundColor Green
Write-Host @"
ENCRYPTION_KEY=$encryptionKey
JWT_SECRET=$jwtSecret
"@

Write-Host "`nSecrets generated successfully!" -ForegroundColor Cyan
Write-Host "IMPORTANT: Keep these secrets safe and never commit them to git!" -ForegroundColor Red

