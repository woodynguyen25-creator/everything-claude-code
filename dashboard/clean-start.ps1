# Clean-start the dashboard dev server.
# Use this after large Codex changes (deleted components, renamed files) to avoid
# 400/500 stale-chunk errors from the .next build cache.
#
# Usage: .\clean-start.ps1
# From Obsidian terminal: powershell -NoProfile -File "C:\Github Repos\everything-claude-code\dashboard\clean-start.ps1"

$ErrorActionPreference = "SilentlyContinue"
$dashDir = $PSScriptRoot

# Kill any process holding port 3737
$conns = Get-NetTCPConnection -LocalPort 3737
foreach ($conn in $conns) {
    if ($conn.OwningProcess -and $conn.OwningProcess -gt 0) {
        Stop-Process -Id $conn.OwningProcess -Force
    }
}

# Remove stale .next cache
$nextDir = Join-Path $dashDir ".next"
if (Test-Path $nextDir) {
    Remove-Item -Recurse -Force $nextDir
    Write-Host "[clean-start] .next cache removed"
}

# Start dev server — binds to 127.0.0.1:3737 via next.config.js
Write-Host "[clean-start] Starting dev server at http://127.0.0.1:3737"
Set-Location $dashDir
npm run dev
