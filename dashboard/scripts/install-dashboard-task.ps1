$ErrorActionPreference = "Stop"
$taskName = "AIOS-Dashboard"
$cmdScript = Join-Path $PSScriptRoot "start-dashboard.cmd"

if (-not (Test-Path $cmdScript)) { Write-Error "start-dashboard.cmd not found at: $cmdScript"; exit 1 }

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Write-Host "[install] Removing existing task..."
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute $cmdScript -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = "PT30S"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "AIOS Next.js dashboard on port 3737. Starts 30s after logon (lets Tailscale come up first)."

Write-Host "[install] Registered scheduled task: $taskName"
Write-Host "[install] DONE - dashboard will auto-start 30s after every logon"
