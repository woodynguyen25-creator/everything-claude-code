$ErrorActionPreference = "Stop"

$taskName = "AIOS-TailscaleProxy"
$cmdScript = Join-Path $PSScriptRoot "tailscale-proxy.cmd"

if (-not (Test-Path $cmdScript)) {
  Write-Error "tailscale-proxy.cmd not found at: $cmdScript"
  exit 1
}

Write-Host "[install] cmd wrapper: $cmdScript"

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Write-Host "[install] Removing existing task..."
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute $cmdScript -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "AIOS Tailscale proxy"

Write-Host "[install] Registered scheduled task: $taskName"
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3
$task = Get-ScheduledTask -TaskName $taskName
$info = Get-ScheduledTaskInfo -TaskName $taskName
Write-Host "[install] State: $($task.State)  LastResult: $($info.LastTaskResult)"
Write-Host "[install] DONE"
