# Hermes deploy — sync Hermes files from PC to Hetzner, launch via PM2.
# Usage:  .\hetzner\deploy.ps1 -ServerIp 5.x.x.x
# Optional: -ServerUser hermes (default), -SkipEnv $true

param(
  [Parameter(Mandatory=$true)][string]$ServerIp,
  [string]$ServerUser = "hermes",
  [string]$LocalHermesRoot = "C:\Users\woody\TradingView Assistant",
  [string]$LocalScriptsRoot = "C:\Users\woody\.claude\scripts",
  [string]$LocalDashboardScripts = "C:\Github Repos\everything-claude-code\dashboard\scripts",
  [bool]$SkipEnv = $false
)

$ErrorActionPreference = "Stop"

function Log($msg) { Write-Host "[deploy] $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "[deploy] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[deploy] $msg" -ForegroundColor Yellow }

Log "Target: ${ServerUser}@${ServerIp}"

# 1. Verify SSH works
Log "1/6 Verifying SSH connection..."
ssh -o BatchMode=yes -o ConnectTimeout=5 "root@${ServerIp}" "echo connected" | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error "SSH failed. Check your IP and SSH key. Run: ssh root@${ServerIp}"
  exit 1
}
Ok "SSH OK"

# 2. Sync core Hermes files
Log "2/6 Syncing hermes.js + hermes-jobs.json..."
$hermesJs = Join-Path $LocalHermesRoot "hermes.js"
$hermesJobs = Join-Path $LocalHermesRoot "hermes-jobs.json"
if (-not (Test-Path $hermesJs)) {
  Warn "hermes.js not found at $hermesJs — copying placeholder from hetzner/hermes-server.js"
  scp "$PSScriptRoot\hermes-server.js" "root@${ServerIp}:/home/hermes/hermes.js"
} else {
  scp $hermesJs "root@${ServerIp}:/home/hermes/hermes.js"
}
if (Test-Path $hermesJobs) {
  scp $hermesJobs "root@${ServerIp}:/home/hermes/hermes-jobs.json"
} else {
  scp "$PSScriptRoot\hermes-jobs.json" "root@${ServerIp}:/home/hermes/hermes-jobs.json"
}

# 3. Sync job scripts
Log "3/6 Syncing job scripts..."
$jobScripts = @(
  (Join-Path $LocalScriptsRoot "morning-brief.js"),
  (Join-Path $LocalScriptsRoot "close-ritual.js"),
  (Join-Path $LocalScriptsRoot "weekly-summary.js"),
  (Join-Path $LocalDashboardScripts "sync-workouts-obsidian.js")
)
foreach ($script in $jobScripts) {
  if (Test-Path $script) {
    $name = Split-Path $script -Leaf
    scp $script "root@${ServerIp}:/home/hermes/scripts/$name"
    Ok "  → $name"
  } else {
    Warn "  ! missing: $script (skipped)"
  }
}

# 4. Install npm deps + generate .env
Log "4/6 Installing npm dependencies on server..."
ssh "root@${ServerIp}" "cd /home/hermes && npm init -y >/dev/null && npm install node-cron better-sqlite3 node-fetch dotenv express 2>&1 | tail -3 && chown -R hermes:hermes /home/hermes"

if (-not $SkipEnv) {
  Log "5/6 Generating .env from local dashboard/.env.local..."
  $localEnv = "C:\Github Repos\everything-claude-code\dashboard\.env.local"
  if (Test-Path $localEnv) {
    # Cryptographically strong token (32 chars, base64-url safe)
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $hermesToken = ([Convert]::ToBase64String($bytes) -replace '\+','-' -replace '/','_' -replace '=','').Substring(0, 32)
    $envContent = (Get-Content $localEnv -Raw) + "`nHERMES_TOKEN=$hermesToken`nHERMES_PORT=3001`n"
    $envContent | ssh "root@${ServerIp}" "cat > /home/hermes/.env && chown hermes:hermes /home/hermes/.env && chmod 600 /home/hermes/.env"
    Ok "  .env synced (token: $hermesToken)"
    $script:GeneratedToken = $hermesToken
  } else {
    Warn "  ! local .env.local not found — skipping. Edit /home/hermes/.env manually on server."
  }
} else {
  Log "5/6 Skipping .env sync (--SkipEnv true)"
}

# 5. Launch via PM2
Log "6/6 Starting Hermes via PM2..."
ssh "root@${ServerIp}" @"
sudo -u hermes bash -c 'cd /home/hermes && pm2 delete hermes 2>/dev/null; pm2 start hermes.js --name hermes && pm2 save'
"@

# Get Tailscale IP for the API URL
$tailscaleIp = ssh "root@${ServerIp}" "tailscale ip -4 | head -n1"
$tailscaleHost = ssh "root@${ServerIp}" "tailscale status --self --json | jq -r '.Self.DNSName' | sed 's/\.\$//'"

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ HERMES DEPLOYED" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════"
Write-Host "   Tailscale IP:   $tailscaleIp"
Write-Host "   Tailscale host: $tailscaleHost"
Write-Host ""
Write-Host "   Add to dashboard/.env.local:" -ForegroundColor Cyan
Write-Host "     HERMES_ENDPOINT=http://${tailscaleHost}:3001" -ForegroundColor Yellow
if ($script:GeneratedToken) {
  Write-Host "     HERMES_TOKEN=$($script:GeneratedToken)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "   Verify:" -ForegroundColor Cyan
Write-Host "     ssh root@${ServerIp} 'sudo -u hermes pm2 logs hermes --lines 20'"
Write-Host "     curl http://${tailscaleHost}:3001/status"
Write-Host "════════════════════════════════════════════════════════════"
