@echo off
setlocal
cd /d "c:\Github Repos\everything-claude-code\dashboard"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$portOpen = Get-NetTCPConnection -LocalPort 3737 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }; if ($portOpen) { Write-Host 'Dashboard already serving on 127.0.0.1:3737'; exit 0 }; Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory (Get-Location) -WindowStyle Hidden"
