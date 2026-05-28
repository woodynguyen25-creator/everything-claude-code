$port = 3737
$existing = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
  Stop-Process -Id $existing.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

Set-Location 'C:\Github Repos\everything-claude-code\dashboard'
Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory (Get-Location) -WindowStyle Hidden
Write-Host "Dashboard restart requested on http://127.0.0.1:$port"
